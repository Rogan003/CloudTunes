import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";

const client = new DynamoDBClient({});
const subscriptionsTable = process.env.SUBSCRIPTION_TABLE!;

export const handler: Handler<boolean> = async (event: any) => {
    try {
        const userId = event.pathParameters.userId;
        const type = event.pathParameters.type;
        const typeId = event.pathParameters.typeId;

        const SK = `${type.toUpperCase()}#${typeId}`;

        const { Item } = await client.send(new GetItemCommand({
            TableName: subscriptionsTable,
            Key: {
                userId: { S: userId },
                SK: { S: SK },
            },
        }));

        if (!Item) {
            return { statusCode: 200, body: JSON.stringify(false) };
        }

        return { statusCode: 200, body: JSON.stringify(true) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
