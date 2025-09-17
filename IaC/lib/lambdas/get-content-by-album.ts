import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Content} from "../models/content-models";

const client = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler<Content> = async (event: any) => {
    try {
        const albumId = event.pathParameters.albumId;

        const { Items } = await client.send(new QueryCommand({
            TableName: contentTable,
            IndexName: "ContentsByAlbum",
            KeyConditionExpression: "albumId = :id",
            ExpressionAttributeValues: { ":id": { S: albumId } }
        }));

        return { statusCode: 200, body: JSON.stringify(Items || []) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
