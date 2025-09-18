import type { UploadContentRequest, UploadContentResponse } from "../models/aws-calls.ts";

// API Gateway URL (or from .env)
export const API_BASE_URL = "https://zoqpwwqkpd.execute-api.eu-central-1.amazonaws.com/prod";

export async function uploadContent(content: UploadContentRequest): Promise<UploadContentResponse> {
    const response = await fetch(`${API_BASE_URL}/contents`, {
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
