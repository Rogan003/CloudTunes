import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import jwt from "jsonwebtoken";
import {JwtPayload} from "jwt-decode";

const client = new DynamoDBClient({});
const subscriptionsTable = process.env.SUBSCRIPTION_TABLE!;

export const handler: Handler<boolean> = async (event: any) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");
        const email = (decoded as any)["email"];

        const type = event.pathParameters.type;
        const typeId = event.pathParameters.typeId;

        const SK = `${type.toUpperCase()}#${typeId}`;

        const { Item } = await client.send(new GetItemCommand({
            TableName: subscriptionsTable,
            Key: {
                userEmail: { S: email },
                SK: { S: SK },
            },
        }));

        if (!Item) {
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "true",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(false)
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(true)
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
