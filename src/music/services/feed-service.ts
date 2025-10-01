import { apiFetch, API_BASE_URL } from "../../shared/api";

export interface FeedItem {
    contentId: string;
    score: number;
    title?: string;
    imageUrl?: string;
    albumId?: string;
    artistIds?: string[];
    genres?: string[];
}

export interface FeedResponse {
    items: FeedItem[];
}

export async function initFeed(): Promise<FeedResponse> {
    const response = await apiFetch(`${API_BASE_URL}/feed/init`, {
        method: "POST",
    });

    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || `Init feed failed with status ${response.status}`);
    }

    return response.json();
}

export async function updateFeed(type: string, payload: any): Promise<any> {
    const response = await apiFetch(`${API_BASE_URL}/feed/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || `Update feed failed with status ${response.status}`);
    }

    return response.json();
}

export async function getFeed(limit: number = 10): Promise<FeedResponse> {
    const response = await apiFetch(`${API_BASE_URL}/feed?limit=${limit}`, {
        method: "GET",
    });

    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || `Get feed failed with status ${response.status}`);
    }

    return response.json();
}
