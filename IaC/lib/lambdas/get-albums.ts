import {DynamoDBClient, QueryCommand} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {AlbumCard} from "../models/music-models";

const client = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<AlbumCard[]> = async () => {
    try {
        const { Items } = await client.send(
            new QueryCommand({
                TableName: contentTable,
                KeyConditionExpression: "contentId = :pk",
                ExpressionAttributeValues: { ":pk": { S: "Albums" } },
                ProjectionExpression: "sortKey, albumName",
            })
        );

        const albums: AlbumCard[] = []
        if (Items) {
            for (const i of Items) {
                const albumId = i.sortKey?.S ?? "";
                const albumName = i.albumName?.S ?? "";
                albums.push({
                    id: albumId,
                    name: albumName,
                });
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(albums),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

