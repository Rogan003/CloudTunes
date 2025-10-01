import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";

export async function handler(
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
    try {
        const token = event.authorizationToken.replace("Bearer ", "");
        const decoded = jwt.decode(token) as JwtPayload;
        const groups = decoded["cognito:groups"] || [];

        if (!groups.includes("admin")) {
            throw new Error("Forbidden");
        }

        return {
            principalId: decoded.sub!,
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
            context: { role: "admin" },
        };
    } catch (err) {
        console.error(err);
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