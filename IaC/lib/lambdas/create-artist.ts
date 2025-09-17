import { PutItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {Artist} from "../../../src/users/models/artist-model";

const client = new DynamoDBClient();
const tableName = process.env.ARTIST_TABLE!;

export const handler: Handler<Artist> = async (event: any) => {
    try {
        const {name, bio, genre} = JSON.parse(event.body);
        const artistId = uuidv4();

        const command = new PutItemCommand({
            TableName: tableName,
            Item: {
                artistId: {S: artistId},
                name: {S: name},
                bio: {S: bio},
                genre: {S: genre}
            },
            ConditionExpression: "attribute_not_exists(artistId)"
        });
        await client.send(command);

        return {
            statusCode: 201,
            body: JSON.stringify({artistId, name, bio, genre}),
        };

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            body: JSON.stringify({ message: error.message }),
        };
    }
};