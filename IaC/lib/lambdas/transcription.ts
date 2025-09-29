import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import OpenAI from "openai";

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});
const contentTable = process.env.CONTENT_TABLE!;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const streamPipeline = promisify(pipeline);

async function transcribeWithWhisper(filePath: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-1"
  });
  return transcription.text;
}

export const handler = async (event: any) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Missing OpenAI API key");

        for (const record of event.Records) {
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
            const contentId = path.basename(key, path.extname(key));

            console.log(`Processing transcription for ${bucket}/${key}`);

            // Download audio from S3 → /tmp
            const tmpPath = `/tmp/${path.basename(key)}`;
            const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            await streamPipeline(response.Body as any, fs.createWriteStream(tmpPath));

            const lyricsText = await transcribeWithWhisper(tmpPath);

            await dynamodb.send(new UpdateItemCommand({
                TableName: contentTable,
                Key: {
                    contentId: { S: contentId },
                    sortKey:   { S: contentId }
                },
                UpdateExpression: "SET transcriptionStatus = :status, lyrics = :lyrics, updatedAt = :now",
                ExpressionAttributeValues: {
                ":status": { S: "COMPLETED" },
                ":lyrics": { S: lyricsText },
                ":now":    { S: new Date().toISOString() }
                }
            }));

            console.log(`Updated DynamoDB with transcription for contentId=${contentId}`);
        }
    } catch (err) {
        console.error("Transcription Lambda failed:", err);
        throw err;
    }
}