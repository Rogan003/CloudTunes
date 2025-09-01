import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = "eu-central-1";
const USER_POOL_CLIENT_ID = "6vmkb912jv1tcdlescg2m1o6sb";

const client = new CognitoIdentityProviderClient({ region: REGION });

export async function confirmRegistration(username: string, code: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
    });

    await client.send(command);
}