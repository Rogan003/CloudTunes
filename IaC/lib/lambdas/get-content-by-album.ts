import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {ContentCard} from "../models/content-models";

const client = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<ContentCard[]> = async (event: any) => {
    try {
        const albumId = event.pathParameters.albumId;

        const { Items } = await client.send(new QueryCommand({
            TableName: contentTable,
            IndexName: "ContentsByAlbum",
            KeyConditionExpression: "albumId = :id",
            ExpressionAttributeValues: { ":id": { S: albumId } }
        }));

        const songs: ContentCard[] = [];
        if (Items) {
            for (const i of Items) {
                const contentId = i.contentId.S!;
                const title = i.title.S!;
                const imageUrl = i.imageUrl.S!;
                songs.push({
                    contentId: contentId,
                    title: title,
                    imageUrl: imageUrl
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
            body: JSON.stringify(songs)
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
