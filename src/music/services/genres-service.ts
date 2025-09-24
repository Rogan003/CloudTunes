import type {AlbumCard, ArtistCard} from "../models/music-models.ts";

export const API_BASE_URL = "https://yztmnnnu7d.execute-api.eu-central-1.amazonaws.com/prod";

export async function getArtistsForGenre(genre: string): Promise<ArtistCard[]> {
    const response = await fetch(`${API_BASE_URL}/artists/genre/` + genre, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Fetch failed with status ${response.status}`);
    }

    return body as ArtistCard[];
}

export async function getAlbumsForGenre(genre: string): Promise<AlbumCard[]> {
    const response = await fetch(`${API_BASE_URL}/albums/genre/` + genre, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Fetch failed with status ${response.status}`);
    }

    return body as AlbumCard[];
}

export async function getGenres(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/genres`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Fetch failed with status ${response.status}`);
    }

    return body as string[];
}