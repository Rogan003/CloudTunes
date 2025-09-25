import type {SubscriptionCard} from "../models/music-models.ts";

export const API_BASE_URL = "https://zoqpwwqkpd.execute-api.eu-central-1.amazonaws.com/prod";

export async function getSubscriptionsForUser(userId: string): Promise<SubscriptionCard[]> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/` + userId, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || `Fetching of subscriptions failed with status ${response.status}`);
    }

    return body as SubscriptionCard[];
}