import type {SubscriptionCard} from "../models/music-models.ts";

export const API_BASE_URL = "https://zoqpwwqkpd.execute-api.eu-central-1.amazonaws.com/prod";

export async function getSubscriptionsForUser(): Promise<SubscriptionCard[]> {
    const response = await fetch(`${API_BASE_URL}/subscriptions`, {
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
    const response = await fetch(`${API_BASE_URL}/subscriptions/`, {
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

    return body;
}

export async function unsubscribe(type: string, id: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/` + type + "/" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Unsubscribing failed with status ${response.status}`);
    }

    return body;
}

export async function getIsSubscribed(type: string, id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/` + type + "/" + id, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Unsubscribing failed with status ${response.status}`);
    }

    return body as boolean;
}