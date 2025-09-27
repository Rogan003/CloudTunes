import {DynamoDBClient, GetItemCommand, QueryCommand} from "@aws-sdk/client-dynamodb";
import {Handler} from "aws-lambda";
import {SubscriptionCard} from "../models/subscriptions-model";
import jwt from "jsonwebtoken";
import {JwtPayload} from "jwt-decode";

const client = new DynamoDBClient({});
const subscriptionTable = process.env.SUBSCRIPTION_TABLE!;
const artistTable = process.env.ARTIST_TABLE!;
const contentTable = process.env.CONTENT_TABLE!;


export const handler: Handler<SubscriptionCard[]> = async (event: any) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");
        const email = (decoded as any)["email"];

        const { Items } = await client.send(
            new QueryCommand({
                TableName: subscriptionTable,
                KeyConditionExpression: "userEmail = :pk",
                ExpressionAttributeValues: { ":pk": { S: `${email}` } },
                ProjectionExpression: "SK",
            })
        );

        const subscriptions: SubscriptionCard[] = []
        if (Items) {
            for (const i of Items) {
                const [type, id] = i.SK.S!.split("#");

                let item: SubscriptionCard;

                if (type == "ARTIST") {
                    const { Item } = await client.send(new GetItemCommand({
                        TableName: artistTable,
                        Key: { artistId: { S: id } },
                    }));
                    if (!Item) continue;

                    item = {
                        id,
                        name: Item.name.S!,
                        type: "artist"
                    }
                } else if (type == "ALBUM") {
                    const { Item } = await client.send(new GetItemCommand({
                        TableName: contentTable,
                        Key: {
                            contentId: { S: "ALBUMS" },
                            sortKey: { S: `${id}` }
                        }
                    }));
                    if (!Item) continue;

                    item = {
                        id,
                        name: Item.albumName.S!,
                        type: "album"
                    }
                } else {
                    item = {
                        id,
                        name: id,
                        type: "genre"
                    }
                }

                subscriptions.push(item);
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(subscriptions),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};