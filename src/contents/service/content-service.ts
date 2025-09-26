import type { GetContentResponse, UploadContentRequest, UploadContentResponse } from "../models/aws-calls.ts";
import type {AlbumCard, ArtistCard} from "../../music/models/music-models.ts";
import { getFromCache } from "./cache-service.ts";

// API Gateway URL (or from .env)
export const API_BASE_URL = "https://zoqpwwqkpd.execute-api.eu-central-1.amazonaws.com/prod";

export async function uploadContent(content: UploadContentRequest): Promise<UploadContentResponse> {
    const response = await fetch(`${API_BASE_URL}/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Upload failed with status ${response.status}`);
    }

    return body as UploadContentResponse;
}

export async function getAllAlbums(): Promise<AlbumCard[]> {
    const res = await fetch(`${API_BASE_URL}/albums`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (!res.ok) {
        throw new Error((body?.message as string) || `Failed to load albums (${res.status})`);
    }
    return body as AlbumCard[];
}

export async function getAllArtists(): Promise<ArtistCard[]> {
    const res = await fetch(`${API_BASE_URL}/artists`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (!res.ok) {
        throw new Error((body?.message as string) || `Failed to load artists (${res.status})`);
    }
    return body as ArtistCard[];
}

export async function getContent(contentId: string): Promise<GetContentResponse> {
    const response = await fetch(`${API_BASE_URL}/contents/${contentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error((body?.message as string) || `Failed to load content (${response.status})`);
    }
    const content = body as GetContentResponse;

    let blob = await getFromCache(contentId);
    if (blob) content.fileUrl = URL.createObjectURL(blob);

    return content;
}

