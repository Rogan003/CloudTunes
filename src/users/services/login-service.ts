import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = "eu-central-1";
const USER_POOL_CLIENT_ID = "6vmkb912jv1tcdlescg2m1o6sb";

const client = new CognitoIdentityProviderClient({ region: REGION });

interface LoginResponse {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

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