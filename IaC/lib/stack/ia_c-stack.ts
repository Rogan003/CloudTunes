import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { addCorsOptions, addMethodWithLambda } from '../utils/methodUtils';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { createArtistModelOptions } from "../models/model-options"
import { requestTemplate } from '../utils/requestTemplate';

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

        
        const artistTable = new Table(this, "artists", {
            partitionKey: { name: "ArtistId", type: AttributeType.STRING },
            tableName: "artists",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const createArtistLambda = new lambdaNode.NodejsFunction(this, "createArtist", {
            entry: "lib/lambdas/create-artist.ts",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 128,
            timeout: cdk.Duration.seconds(5)
        });
        
        artistTable.grantReadWriteData(createArtistLambda);

        const api = new RestApi(this, "cloudtunes-api");

        const createArtistModel = api.addModel("CreateArtistModel", createArtistModelOptions);
        const artists = api.root.addResource("artists");
        addCorsOptions(artists, ["POST"]);
        const createArtistImpl = requestTemplate().body("name").body("bio").body("genres").build();
        addMethodWithLambda(artists, "POST", createArtistLambda, createArtistImpl, createArtistModel);
    }
}