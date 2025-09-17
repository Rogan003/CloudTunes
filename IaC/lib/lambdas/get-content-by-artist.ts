import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Content} from "../models/content-models";

const client = new DynamoDBClient({});
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<Content> = async (event: any) => {
    try {
        const artistId = event.pathParameters.artistId;

        const { Items } = await client.send(new QueryCommand({
            TableName: contentArtistTable,
            KeyConditionExpression: "artistId = :id",
            ExpressionAttributeValues: { ":id": { S: artistId } }
        }));

        const contents = [];
        if (Items) {
            for (const i of Items) {
                const contentId = i.contentId.S!;
                const { Item } = await client.send(new GetItemCommand({
                    TableName: contentTable,
                    Key: { contentId: { S: contentId } }
                }));
                if (Item) contents.push(Item);
            }
        }

        return { statusCode: 200, body: JSON.stringify(contents) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
