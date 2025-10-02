import {DynamoDBClient, PutItemCommand, QueryCommand} from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Handler} from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {Content} from "../models/content-models";

const client = new DynamoDBClient({});
const s3 = new S3Client({});
const sqs = new SQSClient({});
const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const genresTable = process.env.GENRES_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;
const subscriptionTable = process.env.SUBSCRIPTION_TABLE!;
const subscriptionQueueUrl = process.env.SUBSCRIPTION_QUEUE_URL!;
const feedUpdateQueueUrl = process.env.FEED_UPDATE_QUEUE_URL!;

async function detectFile(buffer: Buffer) {
    const { fileTypeFromBuffer } = await import("file-type");
    return fileTypeFromBuffer(buffer);
}

export const handler: Handler<Content> = async (event: any) => {
    try {
        const {
            title,
            imageUrl,
            albumId,
            albumName,
            genres,
            artistIds,
            fileBase64, // base64-encoded content file - song
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

        const filesize = audioBytes.length;
        const detected = await detectFile(audioBytes);
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

        // Insert into Content table (all albums by PK=Albums)
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
            imageUrl:  imageUrl ? { S: imageUrl } : { NULL: true },
            createdAt: { S: now },
            updatedAt: { S: now },
            genres:    { SS: genres },
            artistIds: { SS: artistIds },
            audioS3Key: { S: audioS3Key },
            transcriptionStatus: { S: "PENDING" },
            lyrics: { S: "" }
        };
        if (finalAlbumId) {
            contentItem.albumId = { S: finalAlbumId };
        }

        // Insert into Content table (one item per content)
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

        // Insert genre entries for THIS CONTENT (song)
        for (const genre of genres) {
            await client.send(new PutItemCommand({
                TableName: genresTable,
                Item: {
                    genre: { S: genre },
                    itemKey: { S: `CONTENT#${contentId}` },  // Add this!
                }
            }));
        }

        if (albumId) {
            for (const genre of genres) {
                // Insert into Genres table (one item per genre)
                await client.send(new PutItemCommand({
                    TableName: genresTable,
                    Item: {
                        genre: { S: genre },
                        itemKey: { S: `ALBUM#${albumId}` },
                    }
                }));
                // Insert into Genres table (all genres by PK=Genres)
                await client.send(new PutItemCommand({
                    TableName: genresTable,
                    Item: {
                        genre: { S: "Genres" },
                        itemKey: { S: genre },
                    },
                }));
            }
        }

        const userEmailsForNotification: Set<string> = new Set();

        for (const genre of genres) {
            const { Items } = await client.send(new QueryCommand({
                TableName: subscriptionTable,
                IndexName: "SubscriptionsForType",
                KeyConditionExpression: `SK = :id`,
                ExpressionAttributeValues: { ":id": { S: `GENRE#${genre}` } }
            }));

            if (!Items) {
                continue
            }

            for (const item of Items) {
                const userEmail = item.userEmail.S!
                userEmailsForNotification.add(userEmail);
            }
        }

        for (const artistId of artistIds) {
            const { Items } = await client.send(new QueryCommand({
                TableName: subscriptionTable,
                IndexName: "SubscriptionsForType",
                KeyConditionExpression: `SK = :id`,
                ExpressionAttributeValues: { ":id": { S: `ARTIST#${artistId}` } }
            }));

            if (!Items) {
                continue
            }

            for (const item of Items) {
                const userEmail = item.userEmail.S!
                userEmailsForNotification.add(userEmail);
            }
        }

        const { Items } = await client.send(new QueryCommand({
            TableName: subscriptionTable,
            IndexName: "SubscriptionsForType",
            KeyConditionExpression: `SK = :id`,
            ExpressionAttributeValues: { ":id": { S: `ALBUM#${albumId}` } }
        }));

        if (Items) {
            for (const item of Items) {
                const userEmail = item.userEmail.S!
                userEmailsForNotification.add(userEmail);
            }
        }

        for (const userEmail of userEmailsForNotification) {
            const messageBody = JSON.stringify({ songName: title, userEmail });

            const command = new SendMessageCommand({
                QueueUrl: subscriptionQueueUrl,
                MessageBody: messageBody,
            });

            await sqs.send(command);
        }

        const messageBody = JSON.stringify({
            contentId,
            artistIds,
            genres,
            albumId: finalAlbumId ?? albumId,
            createdAt: now,
        });

        await sqs.send(new SendMessageCommand({
            QueueUrl: feedUpdateQueueUrl,
            MessageBody: messageBody,
        }));

        return {
            statusCode: 201,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contentId,
                filename,
                filetype,
                filesize,
                title,
                imageUrl,
                albumId: finalAlbumId ?? albumId,
                albumName: finalAlbumName,
                genres,
                artistIds,
                createdAt: now,
                updatedAt: now,
                audioS3Key,
                transcriptionStatus: "PENDING",
                lyrics: ""
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