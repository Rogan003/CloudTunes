import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import { S3Event } from "aws-lambda";
import { pipeline } from "stream";
import { promisify } from "util";

const { WhisperModel } = require("whisper-node"); // whisper-node doesn’t have TypeScript typings published on DefinitelyTyped


const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;
const streamPipeline = promisify(pipeline);
const modelPath = path.join(__dirname, "../../models/ggml-base.en.bin");
const model = new WhisperModel(modelPath);

export const handler = async (event: S3Event) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Missing OpenAI API key");

        const bucket = event.Records[0].s3.bucket.name;
        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        const contentId = path.basename(key, path.extname(key));

        console.log("Bucket:", bucket, "Key:", key, "ContentId:", contentId);

        const tmpPath = `/tmp/${path.basename(key)}`;
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        await streamPipeline(response.Body as any, fs.createWriteStream(tmpPath));

        const transcription = await model.transcribe(tmpPath, { language: "en" });

        console.log(transcription.text)

        await dynamodb.send(new UpdateItemCommand({
            TableName: contentTable,
            Key: {
                contentId: { S: contentId },
                sortKey:   { S: contentId }
            },
            UpdateExpression: "SET transcriptionStatus = :status, lyrics = :lyrics, updatedAt = :now",
            ExpressionAttributeValues: {
            ":status": { S: "COMPLETED" },
            ":lyrics": { S: transcription.text },
            ":now":    { S: new Date().toISOString() }
            }
        }));

    } catch (err) {
        console.error("Error in transcription lambda:", err);
        throw err;
    }
}