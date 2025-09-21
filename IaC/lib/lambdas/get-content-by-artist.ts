import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {ContentCard} from "../models/content-models";

const client = new DynamoDBClient({});
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<ContentCard[]> = async (event: any) => {
    try {
        const artistId = event.pathParameters.artistId;

        const { Items } = await client.send(new QueryCommand({
            TableName: contentArtistTable,
            KeyConditionExpression: "artistId = :id",
            ExpressionAttributeValues: { ":id": { S: artistId } }
        }));

        const songs: ContentCard[] = [];
        if (Items) {
            for (const i of Items) {
                const contentId = i.contentId.S!;
                const { Item } = await client.send(new GetItemCommand({
                    TableName: contentTable,
                    Key: { contentId: { S: contentId } }
                }));
                if (Item) {
                    const contentId = Item.contentId.S!;
                    const title = Item.title.S!;
                    const imageUrl = Item.imageUrl.S!;
                    songs.push({
                        contentId: contentId,
                        title: title,
                        imageUrl: imageUrl
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
            body: JSON.stringify(songs)
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
