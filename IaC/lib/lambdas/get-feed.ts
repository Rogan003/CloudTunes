import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { JwtPayload } from "jwt-decode";
import jwt from "jsonwebtoken";

const client = new DynamoDBClient({});
const FEED_TABLE = process.env.FEED_TABLE!;
const CONTENT_TABLE = process.env.CONTENT_TABLE!;

export const handler: Handler = async (event) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");

        const userId = (decoded as any)["sub"];
        if (!userId) throw new Error("No userId in token");

        const limit = event.queryStringParameters?.limit
            ? parseInt(event.queryStringParameters.limit, 10)
            : 10;

        const { Items } = await client.send(
            new QueryCommand({
                TableName: FEED_TABLE,
                KeyConditionExpression: "userId = :uid",
                ExpressionAttributeValues: { ":uid": { S: userId } },
                Limit: limit,
                ScanIndexForward: false,
            })
        );

        const feedItems = [];

        if (Items) {
            for (const item of Items) {
                const contentId = item.contentId.S!;
                const score = item.score?.N ? parseFloat(item.score.N) : 0;

                const { Item: contentItem } = await client.send(
                    new GetItemCommand({
                        TableName: CONTENT_TABLE,
                        Key: {
                            contentId: { S: contentId },
                            sortKey: { S: contentId },
                        },
                    })
                );

                if (contentItem) {
                    feedItems.push({
                        contentId,
                        score,
                        title: contentItem.title?.S,
                        imageUrl: contentItem.imageUrl?.S,
                        albumId: contentItem.albumId?.S,
                        artistIds: contentItem.artistIds?.SS || [],
                        genres: contentItem.genres?.SS || [],
                    });
                }
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ items: feedItems }),
        };

    } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: message }),
        };
    }
};