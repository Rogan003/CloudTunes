import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import {REGION, USER_POOL_CLIENT_ID} from "../../shared/aws-consts.ts";

const client = new CognitoIdentityProviderClient({ region: REGION });

export async function confirmRegistration(username: string, code: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: username,
        ConfirmationCode: code,
    });

    await client.send(command);
}