import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SQSEvent, SQSRecord, Handler } from "aws-lambda";

const ses = new SESClient({});
const sourceEmail = "veselin.roganovic.rogan003@gmail.com"

export const handler: Handler<SQSEvent> = async (event: SQSEvent) => {
    try {
        for (const record of event.Records) {
            console.log(event.Records);
            await processMessage(record);
        }
        return { statusCode: 200 };
    } catch (error: any) {
        console.error("Error processing SQS messages:", error);
        throw error;
    }
};

async function processMessage(record: SQSRecord) {
    const { songName, userEmail } = JSON.parse(record.body);
    console.log(`Entry: ${songName} ${userEmail}`);

    const command = new SendEmailCommand({
        Source: sourceEmail,
        Destination: { ToAddresses: [userEmail] },
        Message: {
            Subject: { Data: `New recommended song - ${songName}!` },
            Body: {
                Text: {
                    Data: `Hello!\n\nThere is a new song for you: ${songName}\n\nBest regards,\nYour Cloud Tunes`,
                },
            },
        },
    });

    await ses.send(command);
}