import { PutItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {Artist} from "../models/artist-model";
import { jwtDecode } from "jwt-decode";
import { DecodedToken } from "../models/decode-token";

const client = new DynamoDBClient({});
const tableName = process.env.ARTIST_TABLE!;
const genresTable = process.env.GENRES_TABLE!;

export const handler: Handler<Artist> = async (event: any) => {
    try {

        // const authHeader = event.headers?.Authorization;
        // if (!authHeader) {
        //     return { statusCode: 401, body: JSON.stringify({ message: "Missing Authorization header" }) };
        // }

        // const token = authHeader.replace("Bearer ", "");
        // const decoded = jwtDecode<DecodedToken>(token);

        // if (!decoded["cognito:groups"]?.includes("admin")) {
        //     return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Admins only" }) };
        // }

        const {name, bio, genres} = JSON.parse(event.body);
        const artistId = uuidv4();

        const command = new PutItemCommand({
            TableName: tableName,
            Item: {
                artistId: {S: artistId},
                name: {S: name},
                bio: {S: bio},
                genres: {SS: genres}
            },
            ConditionExpression: "attribute_not_exists(artistId)"
        });
        await client.send(command);

        await client.send(new PutItemCommand({
            TableName: tableName,
            Item: {
                artistId: { S: "Artists" },
                artist: { S: artistId },
                artistName: { S: name },
            }
        }));

        // Insert into Genres table (one item per genre)
        for (const genre of genres) {
            await client.send(new PutItemCommand({
                TableName: genresTable,
                Item: {
                    genre: { S: genre },
                    itemKey: { S: `ARTIST#${artistId}` },
                    name: { S: name },
                }
            }));

            await client.send(new PutItemCommand({
                TableName: genresTable,
                Item: {
                    genre: { S: "Genres" },
                    itemKey: { S: genre },
                },
            }));
        }

        return {
            statusCode: 201,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({artistId, name, bio, genres}),
        };

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};