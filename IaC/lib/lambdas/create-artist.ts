import { PutItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient();

type CreateArtist = {
    name: string;
    bio: string;
    genres: string[];
}

export const handler: Handler<CreateArtist> = async (event) => {
    const {name, bio, genres} = event;
    const command = new PutItemCommand({
        TableName: "artists",
        Item: {
            ArtistId: { S: uuidv4() },
            Name: { S: name },
            Bio: { S: bio },
            Genres: { L: genres.map((g: string) => ({ S: g })) }
        },
        ConditionExpression: "attribute_not_exists(ArtistId)"
    });
    const response = await client.send(command);
    return response;
};