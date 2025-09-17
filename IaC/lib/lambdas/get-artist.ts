import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import {Artist} from "../../../src/users/models/artist-model";

const client = new DynamoDBClient({});
const artistTable = process.env.ARTIST_TABLE!;

export const handler: Handler<Artist> = async (event: any) => {
    try {
        const artistId = event.pathParameters.artistId;

        const { Item } = await client.send(new GetItemCommand({
            TableName: artistTable,
            Key: { artistId: { S: artistId } },
        }));

        if (!Item) {
            return { statusCode: 404, body: "Artist not found" };
        }
        return { statusCode: 200, body: JSON.stringify(Item) };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
