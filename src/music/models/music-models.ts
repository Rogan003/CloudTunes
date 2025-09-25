export interface ArtistCard {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface AlbumCard {
    id: string;
    name: string;
    imageUrl?: string;
}

export type Song = { id: string; name: string; imageUrl: string; artistId: string; albumId: string };

export interface SubscriptionCard {
    id: string;
    name: string;
    imageUrl?: string;
    type: "artist" | "album" | "genre";
}

export interface Genre {
    id: string;
    name: string;
    imageUrl?: string;
}