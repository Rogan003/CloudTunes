import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class AuthStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'users',
            selfSignUpEnabled: true,
            signInAliases: { email: true, username: true },
            autoVerify: { email: true },
            standardAttributes: {
                givenName: { required: true, mutable: false },
                familyName: { required: true, mutable: false },
                birthdate: { required: true, mutable: false },
            },
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