//import type { DecodedIdToken } from "../../users/models/aws-calls.ts";
import { TokenStorage } from "../../users/services/user-token-storage-service.ts";
import type { Artist } from "../models/artist-model.ts";
import type { CreateArtistRequest } from "../models/aws-calls.ts";
import { apiFetch, API_BASE_URL } from "../../shared/api";
//import { jwtDecode } from "jwt-decode";

export async function createArtist(artistRequest: CreateArtistRequest): Promise<Artist> {
    try {
        const token = TokenStorage.getIdToken();
        if (!token) {
            throw new Error("Not authenticated");
        }
        // const decoded = jwtDecode<DecodedIdToken>(token);
        // const groups = decoded["cognito:groups"] || [];
        // if (!groups.includes("admin")) {
        //     throw new Error("Unauthorized: Only admins can create artists");
        // }
        console.log(artistRequest)
        const response = await apiFetch(`${API_BASE_URL}/artists`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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