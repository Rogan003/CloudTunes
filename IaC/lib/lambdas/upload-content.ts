import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {Content} from "../../../src/users/models/content-models";

const client = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;
const contentArtistTable = process.env.CONTENT_ARTIST_TABLE!;
const genresTable = process.env.GENRES_TABLE!;

export const handler: Handler<Content> = async (event: any) => {
    try {
        const { filename, filetype, filesize, title, imageUrl, albumId, albumName, genres, artistIds } = JSON.parse(event.body);
        const contentId = uuidv4();
        const now = new Date().toISOString();

        await client.send(new PutItemCommand({
            TableName: contentTable,
            Item: {
                contentId: { S: contentId },
                filename: { S: filename },
                filetype: { S: filetype },
                filesize: { N: filesize.toString() },
                title: { S: title },
                imageUrl: { S: imageUrl },
                albumId: { S: albumId },
                albumName: { S: albumName },
                createdAt: { S: now },
                updatedAt: { S: now },
                genres: { SS: genres },
                artistIds: { SS: artistIds },
            },
            ConditionExpression: "attribute_not_exists(contentId)"
        }));

        // Insert into ContentArtistMap table (one item per artist)
        for (const artistId of artistIds) {
            await client.send(new PutItemCommand({
                TableName: contentArtistTable,
                Item: {
                    artistId: { S: artistId },
                    contentId: { S: contentId },
                }
            }));
        }

        // Insert into Genres table (one item per genre)
        for (const genre of genres) {
            await client.send(new PutItemCommand({
                TableName: genresTable,
                Item: {
                    genre: { S: genre },
                    itemKey: { S: `CONTENT#${contentId}` },
                }
            }));
        }

        return {
            statusCode: 201,
            body: JSON.stringify({ contentId, filename, filetype, filesize, title, imageUrl, albumId, albumName, createdAt: now, updatedAt: now, genres, artistIds }),
        };

    } catch (error: any) {
        return {
            statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
            body: JSON.stringify({ message: error.message }),
        };
    }
};
