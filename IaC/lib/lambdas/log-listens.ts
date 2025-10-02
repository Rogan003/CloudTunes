import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});
const listensTable = process.env.LISTENS_TABLE!;

export interface Listens {
    userId: string;
    contentId: string;
    ts: string;
}

export const handler: Handler<Listens[]> = async (event: any) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
        const { userId, contentId } = body as {
            userId?: string; contentId?: string;
        };

        if (!userId || !contentId) {
            return json(400, { message: "userId and contentId are required" });
        }

        const now = new Date().toISOString();

        await ddb.send(new PutItemCommand({
            TableName: listensTable,
            Item: {
                userId: { S: userId },
                contentId: { S: contentId },
                ts: { S: now },
            }
        }));

        return json(201, {
            userId:  userId,
            contentId: contentId,
            ts: now,
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return json(500, { message });
    }
};

function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "false",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}