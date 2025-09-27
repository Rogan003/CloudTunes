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

         return {
             statusCode: 201,
             headers: {
                 "Access-Control-Allow-Origin": "*",
                 "Access-Control-Allow-Credentials": "false",
                 "Content-Type": "application/json",
             },
             body: JSON.stringify({ userId, contentId, rating, now })
         };

     } catch (error: any) {
         const name = (error as { name?: string } | null)?.name;
         const statusCode = name === "ConditionalCheckFailedException" ? 409 : 500;
         const message = error instanceof Error ? error.message : "Unknown error";
         return {
             statusCode,
             headers: {
                 "Access-Control-Allow-Origin": "*",
                 "Access-Control-Allow-Credentials": "false",
                 "Content-Type": "application/json",
             },
             body: JSON.stringify({ message }),
         };
     }
};
