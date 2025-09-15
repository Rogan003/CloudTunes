import type { CreateArtistRequest } from "../models/artist-model";
import { TokenStorage } from "./user-token-storage-service";

const API_URL = "";

export async function createArtist(artistData: CreateArtistRequest) {
  try {
    const token = TokenStorage.getIdToken();
    const response = await fetch(`${API_URL}/artists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(artistData),
    });

    if (!response.ok) {
      throw new Error("Failed to create artist");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating artist:", error);
    throw error;
  }
}