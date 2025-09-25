export interface SubscriptionCard {
    id: string;
    name: string;
    imageUrl?: string;
    type: "artist" | "album" | "genre";
}