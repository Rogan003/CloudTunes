import { TokenStorage } from "../users/services/user-token-storage-service";

export const API_BASE_URL = "https://yztmnnnu7d.execute-api.eu-central-1.amazonaws.com/prod";

// A thin wrapper around fetch that automatically attaches the Cognito IdToken
// to requests going to our API Gateway. Requests to other hosts are passed through
// unchanged (important for presigned S3 URLs, images, etc.).
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // Normalize URL string
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

  const isApiCall = url.startsWith(API_BASE_URL);

  // Clone headers from init to a Headers object for easier manipulation
  const headers = new Headers(init.headers || {});

  if (isApiCall) {
    const idToken = TokenStorage.getIdToken();
    if (idToken) {
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
    }
    // Always ensure JSON content-type if body is a plain object and no content-type provided
    const hasBody = init.body !== undefined && init.body !== null;
    const isJsonBody = hasBody && typeof init.body === "string" && looksLikeJson(init.body as string);
    if (isJsonBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const finalInit: RequestInit = { ...init, headers };
  return fetch(url, finalInit);
}

function looksLikeJson(s: string) {
  const trimmed = s.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}
