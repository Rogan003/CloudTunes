import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { addCorsOptions, addMethodWithLambda } from '../utils/methodUtils';
import { requestTemplate } from '../utils/requestTemplate';
import { createArtistModelOptions, uploadContentModelOptions, ratingModelOptions, subscriptionModelOptions} from "../models/model-options";

export class AuthStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'users',
            selfSignUpEnabled: true,
            signInAliases: {email: true, username: true},
            autoVerify: {email: true},
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
            authFlows: {userPassword: true, userSrp: true},
            preventUserExistenceErrors: true,
        });

        new cdk.CfnOutput(this, 'UserPoolId', {value: userPool.userPoolId});
        new cdk.CfnOutput(this, 'UserPoolClientId', {value: userPoolClient.userPoolClientId});
        new cdk.CfnOutput(this, 'Region', {value: this.region});

        // Contents table
        const contentTable = new dynamodb.Table(this, "Contents", {
            tableName: "Contents",
            partitionKey: { name: "contentId", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        contentTable.addGlobalSecondaryIndex({
            indexName: "ContentsByAlbum",
            partitionKey: { name: "albumId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "contentId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Artist Table
        const artistTable = new dynamodb.Table(this, "Artists", {
            tableName: "Artists",
            partitionKey: {name: "artistId", type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Genres table: map genre -> albums/artists
        const genresTable = new dynamodb.Table(this, "Genres", {
            tableName: "Genres",
            partitionKey: { name: "genre", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "itemKey", type: dynamodb.AttributeType.STRING }, // e.g., "ALBUM#<albumId>" or "ARTIST#<artistId>"
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ContentArtistMap table
        const contentArtistMap = new dynamodb.Table(this, "ContentArtistMap", {
            tableName: "ContentArtistMap",
            partitionKey: { name: "artistId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "contentId", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Rating Table
        const ratingTable = new dynamodb.Table(this, "Ratings", {
            tableName: "Ratings",
            partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "contentId", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        ratingTable.addGlobalSecondaryIndex({
            indexName: "RatingsForContent",
            partitionKey: { name: "contentId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Subscription Table
        const subscriptionTable = new dynamodb.Table(this, "Subscriptions", {
            tableName: "Subscriptions",
            partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda Helpers
        const commonLambdaProps = (entry: string, timeoutSec = 5) => ({
            entry,
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            timeout: cdk.Duration.seconds(timeoutSec),
            bundling: {minify: false},
            environment: {
                CONTENT_TABLE: contentTable.tableName,
                ARTIST_TABLE: artistTable.tableName,
                GENRES_TABLE: genresTable.tableName,
                CONTENT_ARTIST_TABLE: contentArtistMap.tableName,
                RATING_TABLE: ratingTable.tableName,
                SUBSCRIPTION_TABLE: subscriptionTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
            },
        });

        // Lambdas
        const createArtistLambda = new lambdaNode.NodejsFunction(
            this,
            "createArtist",
            commonLambdaProps("lib/lambdas/create-artist.ts")
        );
        const getArtistLambda = new lambdaNode.NodejsFunction(
            this,
            "getArtist",
            commonLambdaProps("lib/lambdas/get-artist.ts")
        );
        const getArtistsByGenreLambda = new lambdaNode.NodejsFunction(
            this,
            "getArtistsByGenre",
            commonLambdaProps("lib/lambdas/get-artists-by-genre.ts")
        );
        artistTable.grantReadWriteData(createArtistLambda);
        artistTable.grantReadData(getArtistLambda);
        genresTable.grantReadData(getArtistsByGenreLambda);

        const getAlbumsByGenreLambda = new lambdaNode.NodejsFunction(
            this,
            "getAlbumsByGenre",
            commonLambdaProps("lib/lambdas/get-albums-by-genre.ts")
        );
        genresTable.grantReadData(getAlbumsByGenreLambda);

        const uploadContentLambda = new lambdaNode.NodejsFunction(
            this,
            "uploadContent",
            commonLambdaProps("lib/lambdas/upload-content.ts", 10)
        );
        const getContentByArtistLambda = new lambdaNode.NodejsFunction(
            this,
            "getContentByArtist",
            commonLambdaProps("lib/lambdas/get-content-by-artist.ts")
        );
        const getContentByAlbumLambda = new lambdaNode.NodejsFunction(
            this,
            "getContentByAlbum",
            commonLambdaProps("lib/lambdas/get-content-by-album.ts")
        );
        const getContentByGenreLambda = new lambdaNode.NodejsFunction(
            this,
            "getContentByGenre",
            commonLambdaProps("lib/lambdas/get-content-by-genre.ts")
        );
        contentTable.grantReadWriteData(uploadContentLambda);
        genresTable.grantReadWriteData(uploadContentLambda);
        contentArtistMap.grantReadWriteData(uploadContentLambda);

        contentTable.grantReadData(getContentByAlbumLambda);
        contentTable.grantReadData(getContentByGenreLambda);
        genresTable.grantReadData(getContentByGenreLambda);
        contentArtistMap.grantReadData(getContentByArtistLambda);
        contentTable.grantReadData(getContentByArtistLambda);

        const rateContentLambda = new lambdaNode.NodejsFunction(
            this,
            "rateContent",
            commonLambdaProps("lib/lambdas/rate-content.ts")
        );
        const getRatingsByContentLambda = new lambdaNode.NodejsFunction(this, "getRatingsByContentFn",
            commonLambdaProps("lib/lambdas/get-ratings-by-content.ts")
        );
        ratingTable.grantReadWriteData(rateContentLambda);
        ratingTable.grantReadData(getRatingsByContentLambda);

        const subscribeLambda = new lambdaNode.NodejsFunction(
            this,
            "subscribe",
            commonLambdaProps("lib/lambdas/subscribe.ts")
        );
        subscriptionTable.grantReadWriteData(subscribeLambda);

        // API Gateway
        const api = new RestApi(this, "cloudtunes-api");

        // POST /artists
        const artists = api.root.addResource("artists");
        addCorsOptions(artists, ["POST"]);
        const createArtistTmpl = requestTemplate()
            // .header("Authorization")
            .body("name")
            .body("bio")
            .body("genres")
            .build();
        addMethodWithLambda(
            artists,
            "POST",
            createArtistLambda,
            createArtistTmpl,
            api.addModel("CreateArtistModel", createArtistModelOptions)
        );

        // GET /artists/{artistId}
        const singleArtist = artists.addResource("{artistId}");
        addCorsOptions(singleArtist, ["GET"]);
        addMethodWithLambda(
            singleArtist,
            "GET",
            getArtistLambda,
            requestTemplate().path("artistId").build()
        );

        // GET /artists/genre/{genre}
        const artistsByGenre = artists.addResource("genre").addResource("{genre}");
        addCorsOptions(artistsByGenre, ["GET"]);
        addMethodWithLambda(
            artistsByGenre,
            "GET",
            getArtistsByGenreLambda,
            requestTemplate().path("genre").build()
        );

        // GET /albums/genre/{genre}
        const albums = api.root.addResource("albums");
        const albumsByGenre = albums.addResource("genre").addResource("{genre}");
        addCorsOptions(albumsByGenre, ["GET"]);
        addMethodWithLambda(
            albumsByGenre,
            "GET",
            getAlbumsByGenreLambda,
            requestTemplate().path("genre").build()
        );

        // POST /contents
        const contents = api.root.addResource("contents");
        addCorsOptions(contents, ["POST"]);
        const uploadContentTmpl = requestTemplate()
            .body("filename")
            .body("filetype")
            .body("filesize")
            .body("title")
            .body("imageUrl")
            .body("albumId")
            .body("albumName")
            .body("genres")
            .body("artistIds")
            .build();
        addMethodWithLambda(
            contents,
            "POST",
            uploadContentLambda,
            uploadContentTmpl,
            api.addModel("UploadContentModel", uploadContentModelOptions)
        );

        // GET /contents/artist/{artistId}
        const contentsByArtist = contents.addResource("artist").addResource("{artistId}");
        addCorsOptions(contentsByArtist, ["GET"]);
        addMethodWithLambda(
            contentsByArtist,
            "GET",
            getContentByArtistLambda,
            requestTemplate().path("artistId").build()
        );

        // GET /contents/album/{albumId}
        const contentsByAlbum = contents.addResource("album").addResource("{albumId}");
        addCorsOptions(contentsByAlbum, ["GET"]);
        addMethodWithLambda(
            contentsByAlbum,
            "GET",
            getContentByAlbumLambda,
            requestTemplate().path("albumId").build()
        );

        // GET /contents/genre/{genre}
        const contentsByGenre = contents.addResource("genre").addResource("{genre}");
        addCorsOptions(contentsByGenre, ["GET"]);
        addMethodWithLambda(
            contentsByGenre,
            "GET",
            getContentByGenreLambda,
            requestTemplate().path("genre").build()
        );

        // POST /ratings
        const ratings = api.root.addResource("ratings");
        addCorsOptions(ratings, ["POST"]);
        addMethodWithLambda(
            ratings,
            "POST",
            rateContentLambda,
            requestTemplate().body("userId").body("contentId").body("rating").build(),
            api.addModel("RatingModel", ratingModelOptions)
        );

        // GET /ratings/contents/{contentId}
        const ratingsByContent = ratings.addResource("content").addResource("{contentId}");
        addCorsOptions(ratingsByContent, ["GET"]);
        addMethodWithLambda(
            ratingsByContent,
            "GET",
            getRatingsByContentLambda,
            requestTemplate().path("contentId").build()
        );

        // POST /subscriptions
        const subs = api.root.addResource("subscriptions");
        addCorsOptions(subs, ["POST"]);
        addMethodWithLambda(
            subs,
            "POST",
            subscribeLambda,
            requestTemplate().body("userId").body("type").body("targetId").build(),
            api.addModel("SubscriptionModel", subscriptionModelOptions)
        );

        // Outputs
        new cdk.CfnOutput(this, "ContentTableName", { value: contentTable.tableName });
        new cdk.CfnOutput(this, "ArtistTableName", { value: artistTable.tableName });
        new cdk.CfnOutput(this, "GenresTableName", { value: genresTable.tableName });
        new cdk.CfnOutput(this, "ContentArtistMapName", { value: contentArtistMap.tableName });
        new cdk.CfnOutput(this, "RatingTableName", { value: ratingTable.tableName });
        new cdk.CfnOutput(this, "SubscriptionTableName", { value: subscriptionTable.tableName });
        new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    }
}
