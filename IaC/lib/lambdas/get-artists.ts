import {DynamoDBClient, GetItemCommand, QueryCommand} from "@aws-sdk/client-dynamodb";
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
                ProjectionExpression: "itemKey",
            })
        );

        const artists = []

        if (Items) {
            for (const i of Items) {
                const artistId = i.artist.S!;
                const { Item } = await client.send(
                    new GetItemCommand({
                        TableName: artistTable,
                        Key: {
                            artistId: { S: artistId },
                            itemKey: { S: artistId }
                        },
                    })
                );
                if (Item) artists.push(Item);
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