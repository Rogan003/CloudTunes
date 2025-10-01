    import {
    CognitoIdentityProviderClient,
    SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {User} from "../models/user-models.ts";
    import type {RegisterResponse} from "../models/aws-calls.ts";
    import {REGION, USER_POOL_CLIENT_ID} from "../../shared/aws-consts.ts";
    import {initFeed} from "../../music/services/feed-service.ts";

const client = new CognitoIdentityProviderClient({ region: REGION });

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

    try {
        await initFeed();
    } catch (error) {
        console.error("Failed to initialize feed:", error);
    }

    return {
        userConfirmed: response.UserConfirmed ?? false,
        userSub: response.UserSub,
    };
}