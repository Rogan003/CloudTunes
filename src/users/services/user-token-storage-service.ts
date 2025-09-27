import type {CognitoTokens} from "../models/aws-calls.ts";
import { jwtDecode } from "jwt-decode";

const ACCESS_TOKEN_KEY = "cognito_access_token";
const ID_TOKEN_KEY = "cognito_id_token";
const REFRESH_TOKEN_KEY = "cognito_refresh_token";

export const TokenStorage = {
    saveTokens: (tokens: CognitoTokens) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    },

    getTokens: (): CognitoTokens | null => {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const idToken = localStorage.getItem(ID_TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (accessToken && idToken && refreshToken) {
            return { accessToken, idToken, refreshToken };
        }
        return null;
    },

    getAccessToken: (): string | null => {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    getIdToken: (): string | null => {
        return localStorage.getItem(ID_TOKEN_KEY);
    },

    getRefreshToken: (): string | null => {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    getUserId: (): string | null => {
        const idToken = localStorage.getItem(ID_TOKEN_KEY);
        if (!idToken) return null;

        try {
            const decoded = jwtDecode<{ sub?: string; ["cognito:username"]?: string }>(idToken);
            return decoded.sub || decoded["cognito:username"] || null;

        } catch {
           return null;
        }
    },

    clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(ID_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};