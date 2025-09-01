    import {
    CognitoIdentityProviderClient,
    SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {User} from "../models/user-models.ts";

const REGION = "eu-central-1";
const USER_POOL_CLIENT_ID = "6vmkb912jv1tcdlescg2m1o6sb";

const client = new CognitoIdentityProviderClient({ region: REGION });

interface RegisterResponse {
    userConfirmed: boolean;
    userSub: string;
}

export async function register(user: User): Promise<RegisterResponse> {
    const command = new SignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: user.username,
        Password: user.password,
        UserAttributes: [
            { Name: "email", Value: user.email },
            { Name: "given_name", Value: user.firstName },
            { Name: "family_name", Value: user.lastName },
            { Name: "birthdate", Value: user.dateOfBirth },
        ],
    });

    const response = await client.send(command);

    if (!response.UserSub) {
        throw new Error("Registration failed");
    }

    return {
        userConfirmed: response.UserConfirmed ?? false,
        userSub: response.UserSub,
    };
}