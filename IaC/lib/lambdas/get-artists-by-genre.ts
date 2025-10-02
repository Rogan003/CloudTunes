import {DynamoDBClient, QueryCommand} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {ArtistCard} from "../models/music-models";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;

export const handler: Handler<ArtistCard[]> = async (event: any) => {
    try {
        const genre = event.pathParameters.genre;

        const { Items } = await client.send(new QueryCommand({
            TableName: genresTable,
            KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
            ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "ARTIST#" } }
        }));

        const artists: ArtistCard[] = [];
        if (Items) {
            for (const i of Items) {
                const artistId = i.itemKey.S!.replace("ARTIST#", "");
                const artistName = i.name.S!;

                artists.push({
                    id: artistId,
                    name: artistName,
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
            body: JSON.stringify(artists)
        };
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
