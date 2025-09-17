import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Rating} from "../../../src/users/models/content-models";

const client = new DynamoDBClient({});
const ratingTable = process.env.RATING_TABLE!;

export const handler: Handler<Rating> = async (event: any) => {
    try {
        const contentId = event.pathParameters.contentId;

        const { Items } = await client.send(new QueryCommand({
            TableName: ratingTable,
            IndexName: "RatingsForContent",
            KeyConditionExpression: "contentId = :c",
            ExpressionAttributeValues: { ":c": { S: contentId } }
        }));

        return { statusCode: 200, body: JSON.stringify(Items || []) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
