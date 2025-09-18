import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Artist} from "../models/artist-model";

const client = new DynamoDBClient({});
const genresTable = process.env.GENRES_TABLE!;
const artistTable = process.env.ARTIST_TABLE!;


export const handler: Handler<Artist> = async (event: any) => {
    try {
        const genre = event.pathParameters.genre;

        const { Items } = await client.send(new QueryCommand({
            TableName: genresTable,
            IndexName: "ArtistsByGenre",
            KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
            ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "ARTIST#" } }
        }));

        const artists = [];
        if (Items) {
            for (const i of Items) {
                const artistId = i.itemKey.S!.replace("ARTIST#", "");
                const { Item } = await client.send(new GetItemCommand({
                    TableName: artistTable,
                    Key: { artistId: { S: artistId } }
                }));
                if (Item) artists.push(Item);
            }
        }

        return { statusCode: 200, body: JSON.stringify(artists) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
