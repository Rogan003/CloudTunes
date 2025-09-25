import {DynamoDBClient, QueryCommand} from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";
import {ArtistCard} from "../models/music-models";

const client = new DynamoDBClient({});
const artistTable = process.env.ARTIST_TABLE!;

export const handler: Handler<ArtistCard[]> = async () => {
    try {
        const { Items } = await client.send(
            new QueryCommand({
                TableName: artistTable,
                KeyConditionExpression: "artistId = :pk",
                ExpressionAttributeValues: { ":pk": { S: "Artists" } },
                ProjectionExpression: "artist, artistName",
            })
        );

        const albums: ArtistCard[] = []
        if (Items) {
            for (const i of Items) {
                const artistId = i.artist.S!;
                const artistName = i.artistName.S!;
                albums.push({
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
            body: JSON.stringify(albums),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};