import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID!,
    clientId: process.env.CLIENT_ID!,
    tokenUse: "id",
});

export async function handler(
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
    try {
        const token = event.authorizationToken.replace("Bearer ", "");
        const payload = await verifier.verify(token);

        // Check for required groups
        const groups = payload["cognito:groups"] || [];
        if (!(groups.includes("admin") || groups.includes("user"))) {
            throw new Error("Forbidden");
        }

        return {
            principalId: payload.sub!,
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "execute-api:Invoke",
                        Effect: "Allow",
                        Resource: event.methodArn,
                    },
                ],
            },
        };
    } catch (err) {
        console.error("Authorization failed:", err);
        return {
            principalId: "unauthorized",
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "execute-api:Invoke",
                        Effect: "Deny",
                        Resource: event.methodArn,
                    },
                ],
            },
        };
    }
}