import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Subscription} from "../../../src/users/models/user-models";

const client = new DynamoDBClient({});
const subscriptionTable = process.env.SUBSCRIPTION_TABLE!;

export const handler: Handler<Subscription> = async (event: any) => {
    try {
        const {userId, type, targetId} = JSON.parse(event.body);
        const SK = `${type.toUpperCase()}#${targetId}`;
        const now = new Date().toISOString();

        await client.send(new PutItemCommand({
            TableName: subscriptionTable,
            Item: {
                userId: { S: userId },
                SK: { S: SK },
                type: { S: type },
                targetId: { S: targetId },
                timestamp: { S: now },
            },
        }));

        return {statusCode: 201, body: JSON.stringify({userId, type, targetId, now})};

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            body: JSON.stringify({ message: error.message }),
        };
    }
};
