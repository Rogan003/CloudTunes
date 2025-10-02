
import {DynamoDBClient, DeleteItemCommand, QueryCommand} from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;

export const handler: Handler = async (event: any) => {
    try {
        const albumId = event.pathParameters?.albumId as string | undefined;
        if (!albumId) {
            return json(400, { message: "albumId path parameter is required" });
        }
        console.log("Album Id ", albumId);

        // all songs in this album
        const { Items: albumSongs } = await ddb.send(
            new QueryCommand({
                TableName: contentTable,
                IndexName: "ContentsByAlbum",
                KeyConditionExpression: "albumId = :aid",
                ExpressionAttributeValues: { ":aid": { S: albumId } },
            })
        );

        // delete each song
        if (albumSongs) {
            for (const song of albumSongs) {
                const contentId = song.contentId?.S;
                const audioS3Key = song.audioS3Key?.S;
                const artistIds = song.artistIds?.SS ?? [];

                if (!contentId) continue;

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

                // delete content item from DynamoDB
                await ddb.send(
                    new DeleteItemCommand({
                        TableName: contentTable,
                        Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
                    })
                );

                // delete also from ContentArtist table
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
            }
        }

        // delete album metadata from Content table (PK=Albums)
        await ddb.send(
            new DeleteItemCommand({
                TableName: contentTable,
                Key: { contentId: { S: "Albums" }, sortKey: { S: albumId } },
            })
        );

        return json(200, { message: "Album and all its songs deleted successfully" });

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