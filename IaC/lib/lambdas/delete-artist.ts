import { DynamoDBClient, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import type { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({});

const artistTable = process.env.ARTIST_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;

export const handler: Handler = async (event: any) => {
    try {
        const artistId = event.pathParameters?.artistId as string | undefined;
        if (!artistId) {
            return json(400, { message: "artistId path parameter is required" });
        }

        // delete all ContentArtistMap entries for this artist
        const { Items: contentLinks } = await ddb.send(
            new QueryCommand({
                TableName: contentArtistTable,
                KeyConditionExpression: "artistId = :aid",
                ExpressionAttributeValues: { ":aid": { S: artistId } },
            })
        );

        if (contentLinks) {
            for (const link of contentLinks) {
                const contentId = link.contentId?.S;
                if (contentId) {
                    await ddb.send(
                        new DeleteItemCommand({
                            TableName: contentArtistTable,
                            Key: { artistId: { S: artistId }, contentId: { S: contentId } },
                        })
                    );
                }
            }
        }

        await ddb.send(
            new DeleteItemCommand({
                TableName: artistTable,
                Key: { artistId: { S: artistId }, itemKey: { S: artistId } },
            })
        );

        return json(200, { message: "Artist deleted successfully (removed from all songs)" });

    } catch (err) {
        const name = (err as { name?: string } | null)?.name;
        const statusCode = name === "ConditionalCheckFailedException" ? 409 : 500;
        const message = err instanceof Error ? err.message : "Unknown error";
        return json(statusCode, { message });
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