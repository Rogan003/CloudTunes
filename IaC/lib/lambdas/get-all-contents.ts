import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;

export const handler: Handler = async () => {
    try {
        const { Items } = await ddb.send(
            new ScanCommand({
                TableName: contentTable,
                FilterExpression: "contentId = sortKey", // without album
            })
        );

        const contents = (Items || []).map((item) => ({
            contentId: item.contentId?.S,
            title: item.title?.S,
            imageUrl: item.imageUrl?.S,
            albumId: item.albumId?.S,
            genres: item.genres?.SS || [],
            artistIds: item.artistIds?.SS || [],
            createdAt: item.createdAt?.S,
        }));

        return json(200, contents);

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