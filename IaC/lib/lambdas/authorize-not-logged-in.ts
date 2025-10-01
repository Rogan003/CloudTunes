import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";

export async function handler(
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
    try {
        if (event.authorizationToken) {
            throw new Error("Token provided");
        }

        return {
            principalId: "no-token",
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
        console.error(err);
        return {
            principalId: "yes-token",
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