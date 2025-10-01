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

export const handler = async (event: S3Event) => {
  try {

    console.log("Received event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      const filename = path.basename(key);
      const contentId = path.basename(key, path.extname(key));

      console.log(`Processing file: ${bucket}/${key}`);

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
      const transcriptPath = `/tmp/${filename}.txt`;
      const cmd = `${WHISPER_BINARY} -m ${MODEL_PATH} -f ${audioPath} -otxt -of ${transcriptPath.replace(".txt", "")}`;
      console.log("Running:", cmd);

      execSync(cmd, { stdio: "inherit" });

      // Read transcription
      const lyrics = fs.readFileSync(transcriptPath, "utf8");
      console.log("Transcription completed. Length:", lyrics.length);

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
    }

    return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify("Transcribed!")
        };
  } catch (error: any) {
      return {
        statusCode: error.name === "ConditionalCheckFailedException" ? 409 : 500,  // 409 - duplicate
        body: JSON.stringify({ message: error.message }),
      };
    }
};