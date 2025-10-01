import {DynamoDBClient, ScanCommand, QueryCommand, PutItemCommand, DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { JwtPayload } from "jwt-decode";
import jwt from "jsonwebtoken";

const client = new DynamoDBClient({});
const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const FEED_TABLE = process.env.FEED_TABLE!;

export const handler: Handler = async (event) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");

        const userId = (decoded as any)["sub"];
        if (!userId) throw new Error("No userId in token");

        const limit = 10;

        const scan = await client.send(
            new ScanCommand({
                TableName: CONTENT_TABLE,
                Limit: 50,
            })
        );

        let items = scan.Items ?? [];

        items = items.filter(it => {
            const contentId = it.contentId?.S;
            const sortKey = it.sortKey?.S;
            return contentId && sortKey && contentId === sortKey;
        });

        if (items.length > limit) {
            // shuffle
            items = items.sort(() => Math.random() - 0.5).slice(0, limit);
        }

        // clear existing feed entries for this user
        const existing = await client.send(
            new QueryCommand({
                TableName: FEED_TABLE,
                KeyConditionExpression: "userId = :u",
                ExpressionAttributeValues: { ":u": { S: userId } },
            })
        );

        if (existing.Items && existing.Items.length > 0) {
            for (const e of existing.Items) {
                const rankKey = e.rankKey.S!;
                await client.send(
                    new DeleteItemCommand({
                        TableName: FEED_TABLE,
                        Key: {
                            userId: { S: userId },
                            rankKey: { S: rankKey },
                        },
                    })
                );
            }
        }

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const contentId = it.contentId?.S ?? "";
            const score: number = it.score?.N ? Number(it.score.N) : 0;
            if (!contentId) continue;

            await client.send(
                new PutItemCommand({
                    TableName: FEED_TABLE,
                    Item: {
                        userId: { S: userId },
                        rankKey: { S: `${String(9999999999 - score).padStart(10, "0")}#${contentId}` },
                        contentId: { S: contentId },
                        score: { N: "0" },
                    },
                })
            );
        }

        return json(200, {
            items: items.map((it) => ({
                contentId: it.contentId?.S,
                score: 0,
            })),
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
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