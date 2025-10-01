import type { GetContentResponse, UploadContentRequest, UploadContentResponse } from "../models/aws-calls.ts";
import type {AlbumCard, ArtistCard} from "../../music/models/music-models.ts";
import { getFromCache } from "./cache-service.ts";
import type {Rating} from "../models/content-models";
import { TokenStorage } from "../../users/services/user-token-storage-service";
import { apiFetch, API_BASE_URL } from "../../shared/api";
import {updateFeed} from "../../music/services/feed-service.ts";

export async function uploadContent(content: UploadContentRequest): Promise<UploadContentResponse> {
    const response = await apiFetch(`${API_BASE_URL}/contents`, {
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

// will be moved to albums-service later, don't move now
export async function getAllAlbums(): Promise<AlbumCard[]> {
    const res = await apiFetch(`${API_BASE_URL}/albums`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (!res.ok) {
        throw new Error((body?.message as string) || `Failed to load albums (${res.status})`);
    }
    return body as AlbumCard[];
}

// will be moved to artists-service later, don't move now
export async function getAllArtists(): Promise<ArtistCard[]> {
    const res = await apiFetch(`${API_BASE_URL}/artists`, {
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
    const response = await apiFetch(`${API_BASE_URL}/contents/${contentId}`, {
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

export async function editContent(contentId: string, update: Partial<UploadContentRequest>): Promise<GetContentResponse> {
    const response = await apiFetch(`${API_BASE_URL}/contents/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body?.message || `Failed to edit content (${response.status})`);
    }
    return body as GetContentResponse;
}

export async function deleteContent(contentId: string): Promise<void> {
    const response = await apiFetch(`${API_BASE_URL}/contents/${contentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        let body: any;
        try { body = await response.json(); } catch {}
        throw new Error(body?.message || `Failed to delete content (${response.status})`);
    }
}

// will move to ratings-service later, don't move now
export async function getRatingsByContent(contentId: string): Promise<Rating[]> {
    const res = await apiFetch(`${API_BASE_URL}/ratings/content/${contentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (!res.ok) {
        throw new Error((body?.message as string) || `Failed to load ratings (${res.status})`);
    }
    return body as Rating[];
}

// will move to ratings-service later, don't move now
export async function rateContent(contentId: string, rating: number): Promise<void> {
    const userId = TokenStorage.getUserId()

    const res = await apiFetch(`${API_BASE_URL}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, contentId, rating }),
    });

    if (!res.ok) {
        let body: any;
        try { body = await res.json(); } catch {}
        throw new Error(body?.message || `Failed to submit rating (${res.status})`);
    }

    try {
        await updateFeed("rate", { contentId, rating });
    } catch (error) {
        console.error("Failed to update feed after rating:", error);
    }

    return res.json();
}

export async function logListen(contentId: string): Promise<void> {
    const userId = TokenStorage.getUserId()

    const response = await apiFetch(`${API_BASE_URL}/listens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, contentId }),
    });

    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || `Log listen failed with status ${response.status}`);
    }

    try {
        await updateFeed("listen", { contentId, ts: new Date().toISOString() });
    } catch (error) {
        console.error("Failed to update feed after listen:", error);
    }
}

// will move to ratings-service later, don't move now
export async function getRatingByUser(contentId: string): Promise<Rating | null> {
    const userId = TokenStorage.getUserId()
    if (userId === null) return null;

    const res = await apiFetch(`${API_BASE_URL}/ratings/content/${encodeURIComponent(contentId)}/user/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();

    if (!res.ok) {
        throw new Error((body?.message as string) || `Failed to load content (${res.status})`);
    }

    return body as Rating;
}

