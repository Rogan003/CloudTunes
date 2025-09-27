import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});
const ratingTable = process.env.RATING_TABLE!;

export const handler: Handler = async (event: any) => {
    try {
        const contentId = event.pathParameters?.contentId as string | undefined;
        const userId = event.pathParameters?.userId as string | undefined;

        if (!contentId || !userId) {
            return json(400, { message: "contentId and userId path parameters are required" });
        }

        const { Item } = await ddb.send(
            new GetItemCommand({
                TableName: ratingTable,
                Key: { userId: { S: userId }, contentId: { S: contentId } },
            })
        );

        if (!Item) {
            return json(404, { message: "Rating not found" });
        }

        return json(200, {
            userId: Item.userId.S,
            contentId: Item.contentId.S,
            rating: Item.rating?.N ? Number(Item.rating.N) : undefined,
            timestamp: Item.timestamp?.S,
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