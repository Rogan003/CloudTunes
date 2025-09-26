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

        const artists: ArtistCard[] = []

        if (Items) {
            for (const i of Items) {
                const artistId = i.itemKey.S!;

                const { Item } = await client.send(
                    new GetItemCommand({
                        TableName: artistTable,
                        Key: {
                            artistId: { S: artistId },
                            itemKey: { S: artistId }
                        },
                        ProjectionExpression: "artistId, #n, imageUrl",
                        ExpressionAttributeNames: { "#n": "name" }
                    })
                );

                if (Item?.artistId?.S && Item?.name?.S) {
                    artists.push({
                        id: Item.artistId.S,
                        name: Item.name.S,
                        imageUrl: Item.imageUrl?.S,
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