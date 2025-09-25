import {DeleteItemCommand, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Subscription} from "aws-cdk-lib/aws-sns";

const client = new DynamoDBClient({});
const subscriptionTable = process.env.SUBSCRIPTION_TABLE!;

export const handler: Handler<Subscription> = async (event: any) => {
    try {
        const userId = event.pathParameters.userId;
        const type = event.pathParameters.type;
        const typeId = event.pathParameters.typeId;

        const SK = `${type.toUpperCase()}#${typeId}`;

        await client.send(new DeleteItemCommand({
            TableName: subscriptionTable,
            Key: {
                userId: { S: userId },
                SK: { S: SK },
            },
        }));

        return {statusCode: 204, body: JSON.stringify("Deleted!")};

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            body: JSON.stringify({ message: error.message }),
        };
    }
};
