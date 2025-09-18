import { TokenStorage } from "../../users/services/user-token-storage-service.ts";
import type { Artist } from "../models/artist-model.ts";
import type { CreateArtistRequest } from "../models/aws-calls.ts";

const API_URL = "https://zoqpwwqkpd.execute-api.eu-central-1.amazonaws.com/prod";

export async function createArtist(artistRequest: CreateArtistRequest): Promise<Artist> {
    try {
        const token = TokenStorage.getIdToken();
        const response = await fetch(`${API_URL}/artists`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(artistRequest),
        });

        const body = await response.json();

        if (!response.ok) {
            throw new Error(body.message || `Failed to create artist ${response.status}`);
        }

        return body as Artist;
    } catch (error) {
        console.error("Error creating artist:", error);
        throw error;
    }
}