import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class AuthStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'users',
            selfSignUpEnabled: true,
            signInAliases: { email: true, username: true },
            autoVerify: { email: true },
            passwordPolicy: {
                minLength: 8,
                requireDigits: true,
                requireLowercase: true,
                requireUppercase: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            mfa: cognito.Mfa.OFF,
        });

        new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
            groupName: 'admin',
            userPoolId: userPool.userPoolId,
        });

        new cognito.CfnUserPoolGroup(this, 'UserGroup', {
            groupName: 'user',
            userPoolId: userPool.userPoolId,
        });

        const postConfirmationFn = new lambdaNode.NodejsFunction(this, "PostConfirmationFn", {
            entry: "lib/lambdas/post-confirmation.ts",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 128,
            timeout: cdk.Duration.seconds(5)
        });

        postConfirmationFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["cognito-idp:AdminAddUserToGroup"],
                resources: ["*"]
            })
        );

        userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationFn);

        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            authFlows: { userPassword: true, userSrp: true },
            preventUserExistenceErrors: true,
        });

        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
        new cdk.CfnOutput(this, 'Region', { value: this.region });
    }
}