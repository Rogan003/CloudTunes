import type {ContentCard} from "../../shared/models/content-models.ts";

export const API_BASE_URL = "https://yztmnnnu7d.execute-api.eu-central-1.amazonaws.com/prod";

export async function getSongsForArtist(artistId: string): Promise<ContentCard[]> {
    const response = await fetch(`${API_BASE_URL}/contents/artist/` + artistId, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Upload failed with status ${response.status}`);
    }

    return body as ContentCard[];
}

export async function getSongsForAlbum(albumId: string): Promise<ContentCard[]> {
    const response = await fetch(`${API_BASE_URL}/contents/album/` + albumId, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Upload failed with status ${response.status}`);
    }

    return body as ContentCard[];
}