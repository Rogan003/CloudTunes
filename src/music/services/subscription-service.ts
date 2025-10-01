import type {SubscriptionCard} from "../models/music-models.ts";
import { apiFetch, API_BASE_URL } from "../../shared/api";
import {updateFeed} from "./feed-service.ts";

export async function getSubscriptionsForUser(): Promise<SubscriptionCard[]> {
    const response = await apiFetch(`${API_BASE_URL}/subscriptions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Fetching of subscriptions failed with status ${response.status}`);
    }

    return body as SubscriptionCard[];
}

export async function subscribe(type: string, id: string): Promise<any> {
    const response = await apiFetch(`${API_BASE_URL}/subscriptions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type,
            typeId: id
        }),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Subscribing failed with status ${response.status}`);
    }

    try {
        await updateFeed("subscribe", { subType: type, id });
    } catch (error) {
        console.error("Failed to update feed after subscribe:", error);
    }

    return body;
}

export async function unsubscribe(type: string, id: string): Promise<string> {
    const response = await apiFetch(`${API_BASE_URL}/subscriptions/` + type + "/" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Unsubscribing failed with status ${response.status}`);
    }

    try {
        await updateFeed("unsubscribe", { subType: type, id });
    } catch (error) {
        console.error("Failed to update feed after unsubscribe:", error);
    }

    return "Deleted!";
}

export async function getIsSubscribed(type: string, id: string): Promise<boolean> {
    const response = await apiFetch(`${API_BASE_URL}/subscriptions/` + type + "/" + id, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Unsubscribing failed with status ${response.status}`);
    }

    return body as boolean;
}