import {DynamoDBClient, GetItemCommand, QueryCommand} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {AlbumCard} from "../models/music-models";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<AlbumCard[]> = async (event: any) => {
    try {
        const genre = event.pathParameters.genre;

        const { Items } = await client.send(new QueryCommand({
            TableName: genresTable,
            KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
            ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "ALBUM#" } }
        }));

        const albums: AlbumCard[] = [];
        if (Items) {
            for (const i of Items) {
                const albumId = i.itemKey.S!.replace("ALBUM#", "");

                const { Item } = await client.send(
                    new GetItemCommand({
                        TableName: contentTable,
                        Key: {
                            contentId: { S: "ALBUMS" },
                            sortKey: { S: `${albumId}` }
                        }
                    })
                );

                albums.push({
                    id: albumId,
                    name: Item?.albumName?.S ?? ""
                })
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(albums)
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
