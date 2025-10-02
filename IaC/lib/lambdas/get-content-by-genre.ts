import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Content} from "../models/content-models";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;
const contentTable = process.env.CONTENT_TABLE!;


export const handler: Handler<Content> = async (event: any) => {
   try {
       const genre = event.pathParameters.genre;

       const { Items } = await client.send(new QueryCommand({
           TableName: genresTable,
           KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
           ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "CONTENT#" } }
       }));

       const contents = [];
       if (Items) {
           for (const i of Items) {
               const contentId = i.itemKey.S!.replace("CONTENT#", "");
               const { Item } = await client.send(new GetItemCommand({
                   TableName: contentTable,
                   Key: {
                       contentId: { S: contentId },
                       sortKey: { S: contentId }
                   },
               }));
               if (Item) contents.push(Item);
           }
       }

       return {
           statusCode: 200,
           headers: {
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Credentials": "false",
               "Content-Type": "application/json",
           },
           body: JSON.stringify(contents)  // Return contents, not Items!
       };


   } catch (error: any) {
       return {
           statusCode: 500,
           headers: {
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Credentials": "false",
               "Content-Type": "application/json",
           },
           body: JSON.stringify({ message: error.message })
       };

   }
};
