import {DynamoDBClient, QueryCommand, PutItemCommand, DeleteItemCommand} from "@aws-sdk/client-dynamodb";
import { SQSHandler } from "aws-lambda";

const client = new DynamoDBClient({});
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTION_TABLE!;
const LISTENS_TABLE = process.env.LISTENS_TABLE!;
const FEED_TABLE = process.env.FEED_TABLE!;

async function readCurrentFeed(userId: string) {
    const res = await client.send(
        new QueryCommand({
            TableName: FEED_TABLE,
            KeyConditionExpression: "userId = :u",
            ExpressionAttributeValues: { ":u": { S: userId } },
        })
    );
    return res.Items ?? [];
}

// simple freshness boost
function freshnessScore(createdAt: string): number {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const hours = ageMs / (1000 * 60 * 60);
    return Math.max(0, 500 - hours);
}

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        const { contentId, artistIds, genres, albumId, createdAt } = JSON.parse(record.body);

        const userBoosts: Map<string, number> = new Map();

        // query subscriptions per artist
        for (const artistId of artistIds) {
            const { Items } = await client.send(new QueryCommand({
                TableName: SUBSCRIPTIONS_TABLE,
                IndexName: "SubscriptionsForType",
                KeyConditionExpression: "SK = :id",
                ExpressionAttributeValues: { ":id": { S: `ARTIST#${artistId}` } }
            }));

            Items?.forEach(i => {
                const u = i.userId.S!;
                userBoosts.set(u, (userBoosts.get(u) ?? 0) + 400);
            });
        }

        // query subscriptions per genre
        for (const genre of genres) {
            const { Items } = await client.send(new QueryCommand({
                TableName: SUBSCRIPTIONS_TABLE,
                IndexName: "SubscriptionsForType",
                KeyConditionExpression: "SK = :id",
                ExpressionAttributeValues: { ":id": { S: `GENRE#${genre}` } }
            }));

            Items?.forEach(i => {
                const u = i.userId.S!;
                userBoosts.set(u, (userBoosts.get(u) ?? 0) + 200);
            });
        }

        // query subscriptions per album
        if (albumId) {
            const { Items } = await client.send(new QueryCommand({
                TableName: SUBSCRIPTIONS_TABLE,
                IndexName: "SubscriptionsForType",
                KeyConditionExpression: "SK = :id",
                ExpressionAttributeValues: { ":id": { S: `ALBUM#${albumId}` } }
            }));

            Items?.forEach(i => {
                const u = i.userId.S!;
                userBoosts.set(u, (userBoosts.get(u) ?? 0) + 300);
            });
        }

        // check recent listens for small boost
        for (const [userId, prevBoost] of userBoosts.entries()) {
            const { Items } = await client.send(new QueryCommand({
                TableName: LISTENS_TABLE,
                KeyConditionExpression: "userId = :u",
                ExpressionAttributeValues: { ":u": { S: userId } },
                Limit: 10,
                ScanIndexForward: false,
            }));

            let listenedBoost = 0;

            if (Items) {
                for (const listen of Items) {
                    const listenedContentId = listen.contentId.S!;
                    const contentResp = await client.send(new QueryCommand({
                        TableName: process.env.CONTENT_TABLE!,
                        KeyConditionExpression: "contentId = :cid",
                        ExpressionAttributeValues: { ":cid": { S: listenedContentId } },
                    }));

                    const listened = contentResp.Items?.[0];
                    if (!listened) continue;

                    const listenedArtistIds = listened.artistIds?.SS ?? [];
                    const listenedGenres = listened.genres?.SS ?? [];
                    const listenedAlbumId = listened.albumId?.S;

                    let times = 0;

                    if (listenedArtistIds.some((a: string) => artistIds.includes(a))) {
                        times++;
                    }
                    if (listenedGenres.some((g: string) => genres.includes(g))) {
                        times++;
                    }
                    if (albumId && listenedAlbumId === albumId) {
                        times++;
                    }

                    listenedBoost += 100 * times;
                }
            }

            userBoosts.set(userId, prevBoost + listenedBoost);
        }

        const fresh = freshnessScore(createdAt);

        for (const [userId, boost] of userBoosts.entries()) {
            const newScore = boost + fresh;

            // 1. load current user's feed
            const existing = await readCurrentFeed(userId);
            const existingMap: Record<string, number> = {};
            for (const it of existing) {
                const cid = it.contentId?.S;
                const sc = it.score?.N ? Number(it.score.N) : 0;
                if (cid) existingMap[cid] = sc;
            }

            // 2. add/update the new content
            existingMap[contentId] = Math.max(existingMap[contentId] ?? 0, newScore);

            // 3. rank again
            const ranked = Object.entries(existingMap)
                .map(([cid, sc]) => ({ contentId: cid, score: sc }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            // 4. delete old feed items
            for (const it of existing) {
                await client.send(new DeleteItemCommand({
                    TableName: FEED_TABLE,
                    Key: { userId: { S: userId }, rankKey: { S: it.rankKey.S! } }
                }));
            }

            // 5. insert new ranked feed
            for (let i = 0; i < ranked.length; i++) {
                const r = ranked[i];
                await client.send(new PutItemCommand({
                    TableName: FEED_TABLE,
                    Item: {
                        userId: { S: userId },
                        rankKey: { S: `${String(9999999999 - r.score).padStart(10, "0")}#${r.contentId}` },
                        contentId: { S: r.contentId },
                        score: { N: r.score.toString() },
                    }
                }));
            }
        }
    }
};
