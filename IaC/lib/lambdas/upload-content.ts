import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const s3 = new S3Client({});
const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const genresTable = process.env.GENRES_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const {
            title,
            imageUrl,
            albumId,
            albumName,
            genres,
            artistIds,
            fileBase64, // base64-encoded content file
        } = JSON.parse(event.body ?? "{}");

        if (!title || !Array.isArray(genres) || !Array.isArray(artistIds) || !fileBase64) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "false",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "Missing some of the required fields: title, genres, artists, content" }),
            };
        }

        const contentId = uuidv4();
        const now = new Date().toISOString();

        const audioBytes = Buffer.from(fileBase64, "base64");

        // Dynamically import ESM module in CJS context
        const { fileTypeFromBuffer } = await import("file-type");

        const filesize = audioBytes.length;
        const detected = await fileTypeFromBuffer(audioBytes);
        const filetype = detected?.mime ?? "application/octet-stream";
        const ext = detected?.ext ? `.${detected.ext}` : "";
        const audioS3Key = `audio/${contentId}${ext}`;
        const filename = `${contentId}${ext}`;

        const putResult = await s3.send(new PutObjectCommand({
            Bucket: contentBucket,
            Key: audioS3Key,
            Body: audioBytes,
            ContentType: filetype,
        }));

        if (!putResult.ETag) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "false",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "S3 upload failed." }),
            };
        }

        let finalAlbumId = albumId as string | undefined;
        let finalAlbumName = albumName as string | undefined;

        // If no albumId was provided, we require albumName to create a new one
        if (!albumId) {
            if (!albumName || albumName.trim() === "") {
                return {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Credentials": "false",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ message: "Either provide an existing albumId or a new albumName." }),
                };
            }
            finalAlbumId = uuidv4();
            finalAlbumName = albumName.trim()
        }

        if (finalAlbumId && finalAlbumName) {
            await client.send(new PutItemCommand({
                TableName: contentTable,
                Item: {
                    contentId: { S: "Albums" },
                    sortKey: { S: finalAlbumId },
                    albumName: { S: finalAlbumName }
                }
            }));
        }

        const contentItem: Record<string, any> = {
            contentId: { S: contentId },
            sortKey:   { S: contentId },
            filename:  { S: filename },
            filetype:  { S: filetype },
            filesize:  { N: filesize.toString() },
            title:     { S: title },
            imageUrl:  imageUrl ? { S: imageUrl } : { NULL: true }, // OK to be NULL (not an index key)
            createdAt: { S: now },
            updatedAt: { S: now },
            genres:    { SS: genres },
            artistIds: { SS: artistIds },
            audioS3Key:{ S: audioS3Key },
        };
        if (finalAlbumId) {
            contentItem.albumId = { S: finalAlbumId };
        }
        if (finalAlbumName) {
            contentItem.albumName = { S: finalAlbumName };
        }

        await client.send(new PutItemCommand({
            TableName: contentTable,
            Item: contentItem,
            ConditionExpression: "attribute_not_exists(contentId)"
        }));

        // Insert into ContentArtistMap table (one item per artist)
        for (const artistId of artistIds) {
            await client.send(new PutItemCommand({
                TableName: contentArtistTable,
                Item: {
                    artistId: { S: artistId },
                    contentId: { S: contentId },
                }
            }));
        }

        // Insert into Genres table (one item per genre)
        if (albumId) {
            for (const genre of genres) {
                await client.send(new PutItemCommand({
                    TableName: genresTable,
                    Item: {
                        genre: { S: genre },
                        itemKey: { S: `ALBUM#${albumId}` },
                    }
                }));
                await client.send(new PutItemCommand({
                    TableName: genresTable,
                    Item: {
                        genre: { S: "Genres" },
                        itemKey: { S: genre },
                    },
                }));
            }
        }

        return {
            statusCode: 201,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contentId,
                filename: filename,
                filetype: filetype,
                filesize: filesize,
                title,
                imageUrl,
                albumId,
                createdAt: now,
                updatedAt: now,
                genres,
                artistIds,
                audioS3Key,
            }),
        };

    } catch (error: unknown) {
        const name = (error as { name?: string } | null)?.name;
        const statusCode = name === "ConditionalCheckFailedException" ? 409 : 500;
        const message = error instanceof Error ? error.message : "Unknown error";
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