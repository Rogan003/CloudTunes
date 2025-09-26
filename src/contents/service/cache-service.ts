import { openDB } from "idb"

const DB_NAME = "cloudtunes-cache-db";
const STORE_NAME = "songs";

async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME))
                db.createObjectStore(STORE_NAME);
        }
    });
}

export async function saveToCache(contentId: string, blob: Blob) {
  const db = await getDB();
  await db.put(STORE_NAME, blob, contentId);
}

export async function getFromCache(contentId: string): Promise<Blob | null> {
  const db = await getDB();
  return db.get(STORE_NAME, contentId);
}