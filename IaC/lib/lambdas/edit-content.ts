import {DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand, UpdateItemCommandInput,} from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Handler } from "aws-lambda";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Content } from "../models/content-models";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;
const genresTable = process.env.GENRES_TABLE!;

async function detectFile(buffer: Buffer) {
    const { fileTypeFromBuffer } = await import("file-type");
    return fileTypeFromBuffer(buffer);
}

export const handler: Handler<Content> = async (event: any) => {
    try {
        const contentId = event.pathParameters?.contentId as string | undefined;
        if (!contentId) {
            return json(400, { message: "contentId path parameter is required" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
        const {
            title,
            imageUrl,
            albumId: providedAlbumId,
            albumName: providedAlbumName,
            genres,
            artistIds,
            fileBase64,
        } = body as {
            title?: string;
            imageUrl?: string | null;
            albumId?: string;
            albumName?: string;
            genres?: string[];
            artistIds?: string[];
            fileBase64?: string | null;
        };

        if (!artistIds || artistIds.length === 0) {
            return json(400, { message: "At least one artist must be selected." });
        }

        if (!genres || genres.length === 0) {
            return json(400, { message: "At least one genre must be selected." });
        }

        const currentContent = await ddb.send(
            new GetItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
            })
        );
        const existing = currentContent.Item;
        if (!existing) {
            return json(404, { message: `Content ${contentId} not found.` });
        }

        const now = new Date().toISOString();
        const oldArtistIds = existing.artistIds?.SS ?? [];
        const oldAudioKey = existing.audioS3Key?.S;
        const oldFilename = existing.filename?.S;
        const oldFiletype = existing.filetype?.S;
        const oldFilesize = existing.filesize?.N ? Number(existing.filesize.N) : undefined;
        const oldGenres = existing.genres?.SS ?? [];
        const oldAlbumId = existing.albumId?.S;

        let finalAlbumId: string;
        let finalAlbumName: string | undefined;

        if (providedAlbumId) {
            finalAlbumId = providedAlbumId;

        } else if (providedAlbumName && providedAlbumName.trim() !== "") {
            finalAlbumId = uuidv4();
            finalAlbumName = providedAlbumName.trim();

        } else if (oldAlbumId) {
            finalAlbumId = oldAlbumId;

        } else {
            return json(400, { message: "You must select an existing album or provide a new album name." });
        }

        // create the new album
        if (finalAlbumName) {
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
            const filename = `${contentId}${ext}`;
            const filesize = audioBytes.length;

            const isSameAsBefore =
                audioS3Key === oldAudioKey &&
                oldFilename === filename &&
                oldFiletype === filetype &&
                oldFilesize === filesize;

            if (!isSameAsBefore) {
                const putResult = await s3.send(
                    new PutObjectCommand({
                        Bucket: contentBucket,
                        Key: audioS3Key,
                        Body: audioBytes,
                        ContentType: filetype,
                    })
                );
                if (!putResult.ETag) {
                    return json(400, { message: "S3 upload failed." });
                }

                if (oldAudioKey && oldAudioKey !== audioS3Key) {
                    try {
                        await s3.send(new DeleteObjectCommand({ Bucket: contentBucket, Key: oldAudioKey }));
                    } catch {
                        // nothing
                    }
                }

                newFilename = filename;
                newFiletype = filetype;
                newFilesize = filesize;
                newAudioS3Key = audioS3Key;
            }
        }

        const setExpr: string[] = [];
        const removeExpr: string[] = [];
        const names: Record<string, string> = {};
        const values: Record<string, AttributeValue> = {};

        names["#updatedAt"] = "updatedAt";
        values[":updatedAt"] = { S: now };
        setExpr.push("#updatedAt = :updatedAt");

        if (typeof title === "string") {
            names["#title"] = "title";
            values[":title"] = { S: title.trim() };
            setExpr.push("#title = :title");
        }

        if (imageUrl !== undefined) {
            names["#imageUrl"] = "imageUrl";
            if (imageUrl === null) {
                removeExpr.push("#imageUrl");
            } else {
                values[":imageUrl"] = { S: imageUrl.trim() };
                setExpr.push("#imageUrl = :imageUrl");
            }
        }

        names["#genres"] = "genres";
        values[":genres"] = { SS: genres };
        setExpr.push("#genres = :genres");

        names["#artistIds"] = "artistIds";
        values[":artistIds"] = { SS: artistIds };
        setExpr.push("#artistIds = :artistIds");

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
        if (newFilesize !== undefined) {
            names["#filesize"] = "filesize";
            values[":filesize"] = { N: newFilesize.toString() };
            setExpr.push("#filesize = :filesize");
        }
        if (newAudioS3Key) {
            names["#audioS3Key"] = "audioS3Key";
            values[":audioS3Key"] = { S: newAudioS3Key };
            setExpr.push("#audioS3Key = :audioS3Key");
        }

        names["#albumId"] = "albumId";
        values[":albumId"] = { S: finalAlbumId };
        setExpr.push("#albumId = :albumId");

        const updateExpression =
            (setExpr.length ? "SET " + setExpr.join(", ") : "") +
            (removeExpr.length ? (setExpr.length ? " " : "") + "REMOVE " + removeExpr.join(", ") : "");

        if (updateExpression) {
            const updateInput: UpdateItemCommandInput = {
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
            };
            await ddb.send(new UpdateItemCommand(updateInput));
        }

        const oldSetArtists = new Set(oldArtistIds);
        const newSetArtists = new Set(artistIds);

        // insert new artist links
        for (const a of newSetArtists) {
            if (!oldSetArtists.has(a)) {
                await ddb.send(
                    new PutItemCommand({
                        TableName: contentArtistTable,
                        Item: { artistId: { S: a }, contentId: { S: contentId } },
                    })
                );
            }
        }

        const oldGenresSet = new Set<string>(oldGenres);
        const newGenresArr = Array.isArray(genres) ? genres : oldGenres;
        const newGenresSet = new Set<string>(newGenresArr);

        // insert new album-genre links
        if (finalAlbumId) {
            for (const g of newGenresSet) {
                if (!oldGenresSet.has(g) || oldAlbumId !== finalAlbumId) {
                    try {
                        await ddb.send(
                            new PutItemCommand({
                                TableName: genresTable,
                                Item: { genre: { S: g }, itemKey: { S: `ALBUM#${finalAlbumId}` } },
                                ConditionExpression: "attribute_not_exists(genre) AND attribute_not_exists(itemKey)",
                            })
                        );
                    } catch {
                        // do nothing
                    }
                }

                try {
                    await ddb.send(
                        new PutItemCommand({
                            TableName: genresTable,
                            Item: { genre: { S: "Genres" }, itemKey: { S: g } },
                            ConditionExpression: "attribute_not_exists(genre) AND attribute_not_exists(itemKey)",
                        })
                    );
                } catch {
                    // do nothing
                }
            }
        }

        const respItem = await ddb.send(
            new GetItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
            })
        );
        const itm = respItem.Item!;

        // Resolve album name for response
        let resolvedAlbumName: string | undefined = finalAlbumName;
        if (!resolvedAlbumName && finalAlbumId) {
            const albumMeta = await ddb.send(
                new GetItemCommand({
                    TableName: contentTable,
                    Key: { contentId: { S: "Albums" }, sortKey: { S: finalAlbumId } },
                    ProjectionExpression: "albumName",
                })
            );
            resolvedAlbumName = albumMeta.Item?.albumName?.S;
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contentId,
                filename: itm.filename?.S ?? newFilename ?? oldFilename ?? "",
                filetype: itm.filetype?.S ?? newFiletype ?? oldFiletype ?? "",
                filesize: itm.filesize?.N ? Number(itm.filesize.N) : (typeof newFilesize === "number" ? newFilesize : (oldFilesize ?? 0)),
                title: itm.title?.S ?? title ?? "",
                imageUrl: itm.imageUrl?.S ?? imageUrl ?? undefined,
                albumId: itm.albumId?.S ?? finalAlbumId,
                genres: itm.genres?.SS ?? (Array.isArray(genres) ? genres : []),
                artistIds: itm.artistIds?.SS ?? artistIds,
                albumName: resolvedAlbumName,
                createdAt: itm.createdAt?.S ?? "",
                updatedAt: itm.updatedAt?.S ?? now,
                audioS3Key: itm.audioS3Key?.S ?? newAudioS3Key ?? oldAudioKey ?? "",
            }),
        };

    } catch (err) {
        const name = (err as { name?: string } | null)?.name;
        const statusCode = name === "ConditionalCheckFailedException" ? 409 : 500;
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
            statusCode,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        };
    }
};

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
