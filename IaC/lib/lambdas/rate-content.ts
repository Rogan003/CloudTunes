import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Rating} from "../models/content-models";

const client = new DynamoDBClient({});
const ratingTable = process.env.RATING_TABLE!;

export const handler: Handler<Rating> = async (event: any) => {
     try {
         const { userId, contentId, rating } = JSON.parse(event.body);
         const now = new Date().toISOString();

         await client.send(new PutItemCommand({
             TableName: ratingTable,
             Item: {
                 userId: { S: userId },
                 contentId: { S: contentId },
                 rating: { N: rating.toString() },
                 timestamp: { S: now },
             },
         }));

         return { statusCode: 201, body: JSON.stringify({ userId, contentId, rating, now }) };

     } catch (error: any) {
         return {
             statusCode: 500,
             body: JSON.stringify({ message: error.message }),
         };
     }
};
