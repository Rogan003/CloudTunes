import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;

export const handler: Handler = async (event: any) => {
    try {
        const contentId = event.pathParameters?.contentId as string | undefined;
        if (!contentId) {
            return json(400, { message: "contentId path parameter is required" });
        }

        // Load existing content
        const { Item } = await ddb.send(
            new GetItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
                ProjectionExpression: "audioS3Key, artistIds",
            })
        );
        if (!Item) {
            return json(404, { message: `Content ${contentId} not found.` });
        }

        const audioS3Key = Item.audioS3Key?.S;
        const artistIds = Item.artistIds?.SS ?? [];

        // delete in S3
        if (audioS3Key) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: contentBucket,
                        Key: audioS3Key,
                    })
                );
            } catch {
                // nothing
            }
        }

        // delete the content
        await ddb.send(
            new DeleteItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
            })
        );

        // delete artist links
        for (const artistId of artistIds) {
            try {
                await ddb.send(
                    new DeleteItemCommand({
                        TableName: contentArtistTable,
                        Key: { artistId: { S: artistId }, contentId: { S: contentId } },
                    })
                );
            } catch {
                // nothing
            }
        }

        return json(200, { message: "Deleted" });

    } catch (err) {
        const name = (err as { name?: string } | null)?.name;
        const statusCode = name === "ConditionalCheckFailedException" ? 409 : 500;
        const message = err instanceof Error ? err.message : "Unknown error";
        return json(statusCode, { message });
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