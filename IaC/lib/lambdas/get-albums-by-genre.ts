import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Artist} from "../models/artist-model";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;

export const handler: Handler<Artist> = async (event: any) => {
    try {
        const genre = event.pathParameters.genre;

        const { Items } = await client.send(new QueryCommand({
            TableName: genresTable,
            KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
            ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "ALBUM#" } }
        }));

        const albums = [];
        if (Items) {
            for (const i of Items) {
                const albumId = i.itemKey.S!.replace("ALBUM#", "");
                const albumName = i.name.S!;
                albums.push({
                    artistId: albumId,
                    artistName: albumName,
                });
            }
        }

        return { statusCode: 200, body: JSON.stringify(albums) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
