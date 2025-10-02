import {DynamoDBClient, ScanCommand} from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";
import {ArtistCard} from "../models/music-models";

const client = new DynamoDBClient({});
const artistTable = process.env.ARTIST_TABLE!;

export const handler: Handler<ArtistCard[]> = async () => {
    try {
        const { Items } = await client.send(
            new ScanCommand({
                TableName: artistTable,
            })
        );

        const artists: ArtistCard[] = [];

        if (Items) {
            for (const item of Items) {
                if (item.artistId?.S && item.name?.S && item.artistId.S === item.itemKey?.S) {
                    artists.push({
                        id: item.artistId.S,
                        name: item.name.S,
                        imageUrl: item.imageUrl?.S,
                    });
                }
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(artists),
        };

    } catch (error: any) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};