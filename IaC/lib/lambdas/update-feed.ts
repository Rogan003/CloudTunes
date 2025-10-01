import {DynamoDBClient, QueryCommand, GetItemCommand, PutItemCommand, DeleteItemCommand, ScanCommand,} from "@aws-sdk/client-dynamodb";
import {Handler} from "aws-lambda";
import { JwtPayload } from "jwt-decode";
import jwt from "jsonwebtoken";

const client = new DynamoDBClient({});
const CONTENT_TABLE = process.env.CONTENT_TABLE!;
const GENRES_TABLE = process.env.GENRES_TABLE!;
const CONTENT_ARTIST_TABLE = process.env.CONTENT_ARTIST_TABLE!;
const LISTENS_TABLE = process.env.LISTENS_TABLE!;
const FEED_TABLE = process.env.FEED_TABLE!;

type Content = {
    contentId: string;
    title?: string;
    imageUrl?: string;
    genres?: string[];
    albumId?: string;
    artistIds?: string[];
    createdAt?: string;
    updatedAt?: string;
};

function freshnessScore(createdAt?: string): number {
    if (!createdAt) return 0;
    const createdAtNum = Date.parse(createdAt);
    if (isNaN(createdAtNum)) return 0;
    const ageHours = (Date.now() - createdAtNum) / (1000 * 60 * 60);
    return Math.max(0, 1000 - ageHours);
}

async function getContentById(contentId: string): Promise<Content | null> {
    const { Item } = await client.send(
        new GetItemCommand({
            TableName: CONTENT_TABLE,
            Key: {
                contentId: { S: contentId },
                sortKey:   { S: contentId },
            },
        })
    );
    if (!Item) return null;
    return {
        contentId: Item.contentId.S!,
        title: Item.title?.S,
        imageUrl: Item.imageUrl?.S,
        genres: Item.genres?.SS || [],
        albumId: Item.albumId?.S,
        artistIds: Item.artistIds?.SS || [],
        createdAt: Item.createdAt?.S,
        updatedAt: Item.updatedAt?.S,
    };
}

async function getContentsByAlbum(albumId: string): Promise<Content[]> {
    const { Items } = await client.send(
        new QueryCommand({
            TableName: CONTENT_TABLE,
            IndexName: "ContentsByAlbum",
            KeyConditionExpression: "albumId = :id",
            ExpressionAttributeValues: { ":id": { S: albumId } },
        })
    );
    const arr: Content[] = [];
    if (!Items) return arr;
    for (const i of Items) {
        arr.push({
            contentId: i.contentId.S!,
            title: i.title?.S,
            imageUrl: i.imageUrl?.S,
            genres: i.genres?.SS || [],
            albumId: i.albumId?.S,
            artistIds: i.artistIds?.SS || [],
            createdAt: i.createdAt?.S,
            updatedAt: i.updatedAt?.S,
        });
    }
    return arr;
}

async function getContentsByArtist(artistId: string): Promise<Content[]> {
    const { Items } = await client.send(
        new QueryCommand({
            TableName: CONTENT_ARTIST_TABLE,
            KeyConditionExpression: "artistId = :id",
            ExpressionAttributeValues: { ":id": { S: artistId } },
        })
    );
    const arr: Content[] = [];
    if (!Items) return arr;
    for (const i of Items) {
        const contentId = i.contentId.S!;
        const content = await getContentById(contentId);
        if (content) arr.push(content);
    }
    return arr;
}

async function getContentsByGenre(genre: string): Promise<Content[]> {
    const { Items } = await client.send(
        new QueryCommand({
            TableName: GENRES_TABLE,
            KeyConditionExpression: "genre = :g AND begins_with(itemKey, :prefix)",
            ExpressionAttributeValues: { ":g": { S: genre }, ":prefix": { S: "CONTENT#" } },
        })
    );
    const arr: Content[] = [];
    if (!Items) return arr;
    for (const i of Items) {
        const contentId = (i.itemKey.S ?? "").replace("CONTENT#", "");
        if (!contentId) continue;
        const content = await getContentById(contentId);
        if (content) arr.push(content);
    }
    return arr;
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

function timeOfDayFromTimestamp(ts: string): "morning" | "evening" | "other" {
    const hour = new Date(ts).getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 18 && hour < 24) return "evening";
    return "other";
}

// ----------------------------------------------------

export const handler: Handler = async (event) => {
    try {
        const token = event.headers.Authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");

        const decoded = jwt.decode(token) as JwtPayload | null;
        if (!decoded) throw new Error("Invalid token");

        const userId = (decoded as any)["sub"];
        if (!userId) throw new Error("No userId in token");

        const body = event.body ? JSON.parse(event.body) : {};
        const { type, payload } = body;
        if (!type) throw new Error("Missing type in request body");

        // contentId -> accumulated score changes
        const candidateScores: Record<string, number> = {};

        function addBoost(contentId: string, boost: number) {
            if (!contentId) return;
            candidateScores[contentId] = (candidateScores[contentId] || 0) + boost;
            console.log(`Boosting ${contentId} by ${boost}`);
            console.log(`Total boost for ${contentId}: ${candidateScores[contentId]}`);
        }

        // --- CASE: rate ---
        if (type === "rate") {
            // payload: { contentId, rating }
            const { contentId, rating } = payload;
            if (!contentId || typeof rating !== "number") throw new Error("Missing contentId or rating for rate type");

            let newRating = rating;
            if (rating >= 3) {
                newRating = newRating * 100;
            } else if (rating < 3) {
                newRating = -newRating * 100;
            }
            addBoost(contentId, newRating);

            const content = await getContentById(contentId);
            if (content) {
                if (content.albumId) {
                    const relatedAlbum = await getContentsByAlbum(content.albumId);
                    for (const rc of relatedAlbum) addBoost(rc.contentId, 100);
                }

                // boost artists
                if (content.artistIds) {
                    for (const a of content.artistIds) {
                        const relatedArtistContents = await getContentsByArtist(a);
                        for (const rc of relatedArtistContents) addBoost(rc.contentId, 100);
                    }
                }

                // boost genres
                if (content.genres) {
                    for (const g of content.genres) {
                        const relatedGenreContents = await getContentsByGenre(g);
                        for (const rc of relatedGenreContents) addBoost(rc.contentId, 100);
                    }
                }
            }
        }

        // --- CASE: listen ---
        else if (type === "listen") {
            // payload: { contentId, ts } - ts optional (use now)
            const { contentId, ts } = payload;
            if (!contentId) throw new Error("Missing contentId for listen type");

            const listenTs = ts ?? new Date().toISOString();
            await client.send(
                new PutItemCommand({
                    TableName: LISTENS_TABLE,
                    Item: {
                        userId: { S: userId },
                        ts: { S: listenTs },
                        contentId: { S: contentId },
                    },
                })
            );

            const listenTod = timeOfDayFromTimestamp(listenTs);  // morning / evening / other
            const nowTod = timeOfDayFromTimestamp(new Date().toISOString());  // morning / evening / others

            const content = await getContentById(contentId);
            if (content) {
                // boosT content itself
                addBoost(contentId, (listenTod === nowTod) ? 200 : 100);

                // boost album
                if (content.albumId) {
                    const relatedAlbum = await getContentsByAlbum(content.albumId);
                    for (const rc of relatedAlbum) addBoost(rc.contentId, (listenTod === nowTod) ? 160 : 80);
                }

                // boost artists
                if (content.artistIds) {
                    for (const a of content.artistIds) {
                        const relatedArtistContents = await getContentsByArtist(a);
                        for (const rc of relatedArtistContents) addBoost(rc.contentId, (listenTod === nowTod) ? 140 : 70);
                    }
                }

                // boost genres
                if (content.genres) {
                    for (const g of content.genres) {
                        const relatedGenreContents = await getContentsByGenre(g);
                        for (const rc of relatedGenreContents) addBoost(rc.contentId, (listenTod === nowTod) ? 120 : 80);
                    }
                }
            }
        }

        // --- CASE: subscribe ---
        else if (type === "subscribe") {
            // payload: { subType: "artist"|"album"|"genre", id: string }
            const { subType, id } = payload;
            if (!subType || !id) throw new Error("Missing subType or id for subscribe type");

            let related: Content[] = [];
            if (subType === "artist") {
                related = await getContentsByArtist(id);
                for (const c of related) addBoost(c.contentId, 400);

            } else if (subType === "album") {
                related = await getContentsByAlbum(id);
                for (const c of related) addBoost(c.contentId, 300);

            } else if (subType === "genre") {
                related = await getContentsByGenre(id);
                for (const c of related) addBoost(c.contentId, 200);

            } else {
                throw new Error("Invalid subType");
            }
        }

        // --- CASE: unsubscribe ---
        else if (type === "unsubscribe") {
            const { subType, id } = payload;
            if (!subType || !id) throw new Error("Missing subType or id for unsubscribe type");

            let related: Content[] = [];
            if (subType === "artist") related = await getContentsByArtist(id);
            else if (subType === "album") related = await getContentsByAlbum(id);
            else if (subType === "genre") related = await getContentsByGenre(id);

            for (const c of related) {
                const boost = subType === "artist" ? 400 : subType === "album" ? 300 : 200;
                addBoost(c.contentId, -boost);
            }
        }

        else {
            throw new Error(`Unknown type ${type}`);
        }

        // ----------------------------------------------------

        const existingItems = await readCurrentFeed(userId);

        // map of existing feed (contentId -> existingScore)
        const existingMap: Record<string, number> = {};
        for (const it of existingItems) {
            const cid = it.contentId?.S;
            const sc = it.score?.N ? Number(it.score.N) : 0;
            if (cid) existingMap[cid] = sc;
        }

        // unified map combining existing + new candidate boosts (contentId -> totalScore)
        const unified: Record<string, number> = {};
        for (const cid of Object.keys(existingMap)) {
            unified[cid] = existingMap[cid];
        }
        for (const cid of Object.keys(candidateScores)) {
            unified[cid] = (unified[cid] || 0) + candidateScores[cid];
        }

        // ----------------------------------------------------

        const unifiedEntries: {
            contentId: string;
            score: number;
            createdAt?: string;
        }[] = [];

        // add freshness for newly boosted content (new items get priority)
        for (const cid of Object.keys(unified)) {
            const meta = await getContentById(cid);
            const baseFresh = freshnessScore(meta?.createdAt);
            const alreadyHad = existingMap[cid] !== undefined;
            let finalScore = unified[cid];
            if (!alreadyHad) finalScore += baseFresh;
            unifiedEntries.push({ contentId: cid, score: finalScore, createdAt: meta?.createdAt });
        }

        // if nothing in unifiedEntries, pick top 10 random contents
        if (unifiedEntries.length === 0) {
            const limit = 10;

            const scan = await client.send(
                new ScanCommand({
                    TableName: CONTENT_TABLE,
                    Limit: 50,
                })
            );

            let items = scan.Items ?? [];

            items = items.filter(it => {
                const contentId = it.contentId?.S;
                const sortKey = it.sortKey?.S;
                return contentId && sortKey && contentId === sortKey;
            });

            if (items.length > limit) {
                // shuffle
                items = items.sort(() => Math.random() - 0.5).slice(0, limit);
            }

            // clear existing feed entries for this user
            const existing = await client.send(
                new QueryCommand({
                    TableName: FEED_TABLE,
                    KeyConditionExpression: "userId = :u",
                    ExpressionAttributeValues: { ":u": { S: userId } },
                })
            );

            if (existing.Items && existing.Items.length > 0) {
                for (const e of existing.Items) {
                    const rankKey = e.rankKey.S!;
                    await client.send(
                        new DeleteItemCommand({
                            TableName: FEED_TABLE,
                            Key: {
                                userId: { S: userId },
                                rankKey: { S: rankKey },
                            },
                        })
                    );
                }
            }

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const contentId = it.contentId?.S ?? "";
                const score: number = it.score?.N ? Number(it.score.N) : 0;

                if (!contentId) continue;
                await client.send(
                    new PutItemCommand({
                        TableName: FEED_TABLE,
                        Item: {
                            userId: { S: userId },
                            rankKey: { S: `${String(9999999999 - score).padStart(10, "0")}#${contentId}` },
                            contentId: { S: contentId },
                            score: { N: "0" },
                        },
                    })
                );
            }
            return {
                statusCode: 200,

                body: JSON.stringify({
                    items: items.map((it) => ({
                        contentId: it.contentId?.S,
                        score: 0,
                    })),
                }),
            };
        }

        // sort unifiedEntries by score desc and take top 10
        const ranked = unifiedEntries
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // delete ALL existing feed entries for this user first
        const existingFeedItems = await readCurrentFeed(userId);
        for (const item of existingFeedItems) {
            await client.send(new DeleteItemCommand({
                TableName: FEED_TABLE,
                Key: {
                    userId: { S: userId },
                    rankKey: { S: item.rankKey.S! }
                }
            }));
        }

        // insert the new top 10
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


        return json(200, {
            updated: ranked.map(r => ({ contentId: r.contentId, score: r.score }))
        });

    } catch (error: any) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return json(500, { message });
    }
};

function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "false",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}