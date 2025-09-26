import { DynamoDBClient, GetItemCommand, UpdateItemCommand, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Handler} from "aws-lambda";
import {Content} from "../models/content-models";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const genresTable = process.env.GENRES_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;

async function detectFile(buffer: Buffer) {
    const { fileTypeFromBuffer } = await import("file-type");
    return fileTypeFromBuffer(buffer);
}

export const handler: Handler<Content> = async (event: any) => {
    try {
        const pathContentId = event.pathParameters?.contentId;
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? {};
        const {
            contentId: bodyContentId,
            title,
            imageUrl,
            albumId,
            genres,
            artistIds,
            fileBase64,
        } = body as {
            contentId?: string;
            title?: string;
            imageUrl?: string | null;
            albumId?: string | null;
            genres?: string[] | null;
            artistIds?: string[] | null;
            fileBase64?: string | null;
        };

        const contentId = pathContentId || bodyContentId;
        if (!contentId) {
            return json(400, { message: "contentId is required (in path or body)" });
        }

        const existing = await ddb.send(
            new GetItemCommand({
                TableName: contentTable,
                Key: {
                    contentId: { S: contentId },
                    sortKey: { S: contentId },
                },
            })
        );
        if (!existing.Item) {
            return json(404, { message: `Content ${contentId} not found` });
        }

        const now = new Date().toISOString();

        const oldArtistIds = existing.Item.artistIds?.SS ?? [];
        const oldAudioKey = existing.Item.audioS3Key?.S;
        const oldAlbumId = existing.Item.albumId?.S;
        const oldGenres = existing.Item.genres?.SS ?? [];

        let newFilename: string | undefined;
        let newFiletype: string | undefined;
        let newFilesize: number | undefined;
        let newAudioS3Key: string | undefined;

        if (fileBase64) {
            const audioBytes = Buffer.from(fileBase64, "base64");
            const detected = await detectFile(audioBytes);
            const filetype = detected?.mime ?? "application/octet-stream";
            const ext = detected?.ext ? `.${detected.ext}` : "";
            const audioS3Key = `audio/${contentId}${ext}`;
            const put = await s3.send(
                new PutObjectCommand({
                    Bucket: contentBucket,
                    Key: audioS3Key,
                    Body: audioBytes,
                    ContentType: filetype,
                })
            );
            if (!put.ETag) {
                return json(400, { message: "S3 upload failed." });
            }
            newFilename = `${contentId}${ext}`;
            newFiletype = filetype;
            newFilesize = audioBytes.length;
            newAudioS3Key = audioS3Key;

            if (oldAudioKey && oldAudioKey !== audioS3Key) {
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: contentBucket,
                            Key: oldAudioKey,
                        })
                    );
                } catch { /*  :)  */ }
            }
        }

        const setExpr: string[] = [];
        const removeExpr: string[] = [];
        const names: Record<string, string> = {};
        const values: Record<string, any> = {};

        names["#updatedAt"] = "updatedAt";
        values[":updatedAt"] = { S: now };
        setExpr.push("#updatedAt = :updatedAt");

        if (typeof title === "string") {
            names["#title"] = "title";
            values[":title"] = { S: title.trim() };
            setExpr.push("#title = :title");
        }

        if (typeof imageUrl === "string") {
            names["#imageUrl"] = "imageUrl";
            values[":imageUrl"] = { S: imageUrl.trim() };
            setExpr.push("#imageUrl = :imageUrl");
        } else if (imageUrl === null) {
            names["#imageUrl"] = "imageUrl";
            removeExpr.push("#imageUrl");
        }

        if (Array.isArray(genres)) {
            if (genres.length > 0) {
                names["#genres"] = "genres";
                values[":genres"] = { SS: genres };
                setExpr.push("#genres = :genres");
            } else {
                names["#genres"] = "genres";
                removeExpr.push("#genres");
            }
        }

        if (Array.isArray(artistIds)) {
            if (artistIds.length > 0) {
                names["#artistIds"] = "artistIds";
                values[":artistIds"] = { SS: artistIds };
                setExpr.push("#artistIds = :artistIds");
            } else {
                names["#artistIds"] = "artistIds";
                removeExpr.push("#artistIds");
            }
        }

        if (newFilename) {
            names["#filename"] = "filename";
            values[":filename"] = { S: newFilename };
            setExpr.push("#filename = :filename");
        }
        if (newFiletype) {
            names["#filetype"] = "filetype";
            values[":filetype"] = { S: newFiletype };
            setExpr.push("#filetype = :filetype");
        }
        if (typeof newFilesize === "number") {
            names["#filesize"] = "filesize";
            values[":filesize"] = { N: newFilesize.toString() };
            setExpr.push("#filesize = :filesize");
        }
        if (newAudioS3Key) {
            names["#audioS3Key"] = "audioS3Key";
            values[":audioS3Key"] = { S: newAudioS3Key };
            setExpr.push("#audioS3Key = :audioS3Key");
        }

        let finalAlbumId: string | undefined;
        let finalAlbumName: string | undefined;

        if (typeof albumId === "string" && albumId.trim()) {
            finalAlbumId = albumId.trim();
            names["#albumId"] = "albumId";
            values[":albumId"] = { S: finalAlbumId };
            setExpr.push("#albumId = :albumId");
        } else if (albumId === null) {
            names["#albumId"] = "albumId";
            removeExpr.push("#albumId");
        }

        const updateExpression =
            (setExpr.length ? "SET " + setExpr.join(", ") : "") +
            (removeExpr.length ? (setExpr.length ? " " : "") + "REMOVE " + removeExpr.join(", ") : "");

        if (!updateExpression) {
            return json(200, { message: "No changes provided." });
        }

        await ddb.send(
            new UpdateItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
            })
        );

        // 5) Update ContentArtistMap if artistIds provided
        if (Array.isArray(artistIds)) {
            const newSet = new Set(artistIds);
            const oldSet = new Set(oldArtistIds);

            // Deletes
            for (const old of oldSet) {
                if (!newSet.has(old)) {
                    await ddb.send(
                        new DeleteItemCommand({
                            TableName: contentArtistTable,
                            Key: { artistId: { S: old }, contentId: { S: contentId } },
                        })
                    );
                }
            }
            for (const a of newSet) {
                if (!oldSet.has(a)) {
                    await ddb.send(
                        new PutItemCommand({
                            TableName: contentArtistTable,
                            Item: { artistId: { S: a }, contentId: { S: contentId } },
                        })
                    );
                }
            }
        }

        if (finalAlbumId && finalAlbumName) {
            await ddb.send(
                new PutItemCommand({
                    TableName: contentTable,
                    Item: {
                        contentId: { S: "Albums" },
                        sortKey: { S: finalAlbumId },
                        albumName: { S: finalAlbumName },
                    },
                })
            );
        }

        // 7) If both albumId and genres provided, ensure genre mappings exist
        if ((finalAlbumId || oldAlbumId) && Array.isArray(genres)) {
            const albumRef = finalAlbumId ?? oldAlbumId;
            if (albumRef) {
                for (const g of genres) {
                    await ddb.send(
                        new PutItemCommand({
                            TableName: genresTable,
                            Item: { genre: { S: g }, itemKey: { S: `ALBUM#${albumRef}` } },
                        })
                    );
                    await ddb.send(
                        new PutItemCommand({
                            TableName: genresTable,
                            Item: { genre: { S: "Genres" }, itemKey: { S: g } },
                        })
                    );
                }
            }
        }

        return json(200, { message: "Content updated", contentId });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return json(500, { message });
    }
};

// Small helper to format JSON responses with CORS
function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "false",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}