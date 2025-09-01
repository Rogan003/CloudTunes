import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import type { PostConfirmationTriggerEvent } from "aws-lambda";

const client = new CognitoIdentityProviderClient({});

export const handler = async (event: PostConfirmationTriggerEvent) => {
    if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
        const command = new AdminAddUserToGroupCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            GroupName: "user",
        });

        await client.send(command);
    }

    return event;
};