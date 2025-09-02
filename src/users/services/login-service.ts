import {
    CognitoIdentityProviderClient,
    GlobalSignOutCommand,
    InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {REGION, USER_POOL_CLIENT_ID} from "../../shared/aws-consts.ts";
import type {LoginResponse} from "../models/aws-calls.ts";

const client = new CognitoIdentityProviderClient({ region: REGION });

export async function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: USER_POOL_CLIENT_ID,
        AuthParameters: {
            USERNAME: usernameOrEmail,
            PASSWORD: password,
        },
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
        throw new Error("Login failed");
    }

    const { IdToken, AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

    return {
        idToken: IdToken!,
        accessToken: AccessToken!,
        refreshToken: RefreshToken!,
        expiresIn: ExpiresIn!,
    };
}

export async function globalSignOut(accessToken: string) {
    try {
        const command = new GlobalSignOutCommand({ AccessToken: accessToken });
        const response = await client.send(command);
        console.log("User logged out globally:", response);
    } catch (err) {
        console.error("Error signing out globally:", err);
    }
}