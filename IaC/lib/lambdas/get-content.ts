import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({});
const s3 = new S3Client({});
const contentTable = process.env.CONTENT_TABLE!;
const contentBucket = process.env.CONTENT_BUCKET!;

export const handler: APIGatewayProxyHandlerV2 = async (event: any) => {
    try {
        const contentId = event.pathParameters.contentId;

        if (!contentId) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "false",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "Missing contentId in path." }),
            };
        }

        const getResult = await client.send(
            new GetItemCommand({
                TableName: contentTable,
                Key: {
                    contentId: { S: contentId },
                    sortKey: { S: contentId },
                },
            })
        );

        if (!getResult.Item) {
            return {
                statusCode: 404,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "false",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "Content not found." }),
            };
        }

        const item = getResult.Item;
        const audioS3Key = item.audioS3Key.S;
        const presignedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: contentBucket, Key: audioS3Key }),
            { expiresIn: 3600 } // 1 hour validity
        );

        let albumName: string | undefined;
        if (item.albumId?.S) {
            const albumResult = await client.send(
                new GetItemCommand({
                    TableName: contentTable,
                    Key: { contentId: { S: "Albums" }, sortKey: { S: item.albumId.S } },
                })
            );
            albumName = albumResult.Item?.albumName?.S;
        }

        const response = {
            contentId: item.contentId.S,
            filename: item.filename.S,
            filetype: item.filetype.S,
            filesize: item.filesize.N,
            title: item.title.S,
            imageUrl: item.imageUrl?.S,
            albumId: item.albumId?.S,
            albumName: albumName,
            createdAt: item.createdAt.S,
            updatedAt: item.updatedAt.S,
            genres: item.genres?.SS ?? [],
            artistIds: item.artistIds?.SS ?? [],
            fileUrl: presignedUrl, // frontend can play or download
        };

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "false",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(response),
        };
    } catch (error: unknown) {
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