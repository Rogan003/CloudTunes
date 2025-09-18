export interface LoginResponse {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface RegisterResponse {
    userConfirmed: boolean;
    userSub: string;
}

export interface CognitoTokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
}

export interface DecodedIdToken {
  "cognito:groups"?: string[];
  [key: string]: any;
}