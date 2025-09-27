import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Subscription} from "aws-cdk-lib/aws-sns";
import jwt from "jsonwebtoken";
import {JwtPayload} from "jwt-decode";

const client = new DynamoDBClient({});
const subscriptionTable = process.env.SUBSCRIPTION_TABLE!;

export const handler: Handler<Subscription> = async (event: any) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");
        const email = (decoded as any)["email"];

        const {type, typeId} = JSON.parse(event.body);
        const SK = `${type.toUpperCase()}#${typeId}`;
        const now = new Date().toISOString();

        await client.send(new PutItemCommand({
            TableName: subscriptionTable,
            Item: {
                userEmail: { S: email },
                SK: { S: SK },
                timestamp: { S: now },
            },
        }));

        return {statusCode: 201, body: JSON.stringify({email, type, typeId, now})};

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            body: JSON.stringify({ message: error.message }),
        };
    }
};
