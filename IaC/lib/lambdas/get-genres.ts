import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;

export const handler: Handler<string[]> = async () => {
    try {
        const { Items } = await client.send(new QueryCommand({
            TableName: genresTable,
            KeyConditionExpression: "genre = :g",
            ExpressionAttributeValues: { ":g": { S: "Genres" } }
        }));

        const genres = [];
        if (Items) {
            for (const i of Items) {
                if (i.itemKey.S) {
                    genres.push(i.itemKey.S)
                }
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(genres)
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
