import { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});

const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const MODEL_PATH = "/var/task/models/ggml-base.en.bin"; // mounted in Docker image
const WHISPER_BINARY = "/var/task/whisper.cpp/whisper-cli";   // compiled whisper.cpp binary

const MAX_RETRIES = 3;

export const handler = async (event: S3Event) => {
  
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const filename = path.basename(key);
    const contentId = path.basename(key, path.extname(key));
    
    try {
      console.log(`Processing file: ${bucket}/${key}`);

      await dynamo.send(
        new UpdateItemCommand({
          TableName: CONTENT_TABLE,
          Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
          UpdateExpression:
            "SET transcriptionStatus = :status, updatedAt = :now",
          ExpressionAttributeValues: {
            ":status": { S: "PENDING" },
            ":now": { S: new Date().toISOString() },
          },
        })
      );

      // Download audio file from S3
      const audioPath = `/tmp/${filename}`;
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const data = await s3.send(getCmd);
      if (!data.Body) throw new Error("No file body from S3");

      const writeStream = fs.createWriteStream(audioPath);
      await new Promise((resolve, reject) => {
        (data.Body as any).pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      console.log("Downloaded audio to", audioPath);

      // Run Whisper transcription (using whisper.cpp binary)
      let lyrics: string = "";
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`Transcription attempt ${attempt}...`);
          const transcriptPath = `/tmp/${filename}.txt`;
          const cmd = `${WHISPER_BINARY} -m ${MODEL_PATH} -f ${audioPath} -otxt -of ${transcriptPath.replace(".txt", "")}`;
          console.log("Running:", cmd);
          execSync(cmd, { stdio: "inherit" });
          lyrics = fs.readFileSync(transcriptPath, "utf8");
          break;
        } catch (error: any) {
          console.error(`Transcription failed (attempt ${attempt})`, error);
          if (attempt === MAX_RETRIES) throw error;
        }

      }

      if (!lyrics) throw new Error("Transcription ultimately failed");

      // Save into DynamoDB
      await dynamo.send(new UpdateItemCommand({
                  TableName: CONTENT_TABLE,
                  Key: {
                      contentId: { S: contentId },
                      sortKey:   { S: contentId }
                  },
                  UpdateExpression: "SET transcriptionStatus = :status, lyrics = :lyrics, updatedAt = :now",
                  ExpressionAttributeValues: {
                  ":status": { S: "COMPLETED" },
                  ":lyrics": { S: lyrics },
                  ":now":    { S: new Date().toISOString() }
                  }
              }));

      console.log(`Saved transcription for ${filename}`);
    } catch (error: any) {
      console.error("Final transcription failure:", error);

      // Save FAILED status
      await dynamo.send(
        new UpdateItemCommand({
          TableName: CONTENT_TABLE,
          Key: { contentId: { S: contentId }, sortKey: { S: contentId } },
          UpdateExpression:
            "SET transcriptionStatus = :status, errorMessage = :msg, updatedAt = :now",
          ExpressionAttributeValues: {
            ":status": { S: "FAILED" },
            ":msg": { S: error.message },
            ":now": { S: new Date().toISOString() },
          },
        })
      );

    }
  }
};