import {
    DynamoDBClient,
    QueryCommand,
    PutItemCommand,
    DeleteItemCommand,
    GetItemCommand
} from "@aws-sdk/client-dynamodb";
import { SQSHandler } from "aws-lambda";
import {CognitoIdentityProviderClient, ListUsersCommand} from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTION_TABLE!;
const LISTENS_TABLE = process.env.LISTENS_TABLE!;
const FEED_TABLE = process.env.FEED_TABLE!;
const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

const emailToUserIdCache: Map<string, string> = new Map();

async function getUserIdFromEmail(email: string): Promise<string | null> {
    if (emailToUserIdCache.has(email)) {
        return emailToUserIdCache.get(email)!;
    }

    try {
        const response = await cognito.send(new ListUsersCommand({
            UserPoolId: USER_POOL_ID,
            Filter: `email = "${email}"`,
            Limit: 1,
        }));

        if (response.Users && response.Users.length > 0) {
            const user = response.Users[0];

            const subAttr = user.Attributes?.find(attr => attr.Name === 'sub');
            const userId = subAttr?.Value;

            if (!userId) {
                console.error(`No sub found for user with email ${email}`);
                return null;
            }

            emailToUserIdCache.set(email, userId);
            return userId;
        }

    } catch (error) {
        console.error(`Failed to get userId for email ${email}:`, error);
    }

    return null;
}

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
                const userEmail = i.userEmail.S!;
                userBoosts.set(userEmail, (userBoosts.get(userEmail) ?? 0) + 400);
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
                const userEmail = i.userEmail.S!;
                userBoosts.set(userEmail, (userBoosts.get(userEmail) ?? 0) + 200);
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
                const userEmail = i.userEmail.S!;
                userBoosts.set(userEmail, (userBoosts.get(userEmail) ?? 0) + 300);
            });
        }

        const fresh = freshnessScore(createdAt);

        // Convert emails to userIds and process each user
        for (const [userEmail, boost] of userBoosts.entries()) {
            const userId = await getUserIdFromEmail(userEmail);
            if (!userId) {
                console.log(`Could not find userId for email: ${userEmail}`);
                continue;
            }

            // Check recent listens for additional boost
            const { Items: listenItems } = await client.send(new QueryCommand({
                TableName: LISTENS_TABLE,
                KeyConditionExpression: "userId = :u",
                ExpressionAttributeValues: { ":u": { S: userId } },
                Limit: 10,
                ScanIndexForward: false,
            }));

            let listenedBoost = 0;

            if (listenItems) {
                for (const listen of listenItems) {
                    const listenedContentId = listen.contentId.S!;
                    const { Item } = await client.send(new GetItemCommand({
                        TableName: CONTENT_TABLE,
                        Key: {
                            contentId: { S: listenedContentId },
                            sortKey: { S: listenedContentId },
                        },
                    }));

                    if (!Item) continue;

                    const listenedArtistIds = Item.artistIds?.SS ?? [];
                    const listenedGenres = Item.genres?.SS ?? [];
                    const listenedAlbumId = Item.albumId?.S;

                    let matches = 0;
                    if (listenedArtistIds.some((a: string) => artistIds.includes(a))) matches++;
                    if (listenedGenres.some((g: string) => genres.includes(g))) matches++;
                    if (albumId && listenedAlbumId === albumId) matches++;

                    listenedBoost += 100 * matches;
                }
            }

            const totalBoost = boost + listenedBoost;
            const newScore = totalBoost + fresh;

            // Load current user's feed
            const existing = await readCurrentFeed(userId);
            const existingMap: Record<string, number> = {};
            for (const it of existing) {
                const cid = it.contentId?.S;
                const sc = it.score?.N ? Number(it.score.N) : 0;
                if (cid) existingMap[cid] = sc;
            }

            // Add/update the new content
            existingMap[contentId] = Math.max(existingMap[contentId] ?? 0, newScore);

            // Rank again
            const ranked = Object.entries(existingMap)
                .map(([cid, sc]) => ({ contentId: cid, score: sc }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            // Delete old feed items
            for (const it of existing) {
                await client.send(new DeleteItemCommand({
                    TableName: FEED_TABLE,
                    Key: { userId: { S: userId }, rankKey: { S: it.rankKey.S! } }
                }));
            }

            // Insert new ranked feed
            for (const r of ranked) {
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

            console.log(`Updated feed for user ${userId} (${userEmail}) with content ${contentId}, score: ${newScore}`);
        }
    }
};
