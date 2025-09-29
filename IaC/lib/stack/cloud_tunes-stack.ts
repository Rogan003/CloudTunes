import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { addCorsOptions, addMethodWithLambda } from '../utils/methodUtils';
import { requestTemplate } from '../utils/requestTemplate';
import { createArtistModelOptions, uploadContentModelOptions, ratingModelOptions, subscriptionModelOptions} from "../models/model-options";

export class AppStack extends cdk.Stack {
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
            sortKey: { name: "sortKey", type: dynamodb.AttributeType.STRING },
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
            sortKey: {name: "itemKey", type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Genres table: map genre -> albums/artists || "Genres" -> genre_name
        const genresTable = new dynamodb.Table(this, "Genres", {
            tableName: "Genres",
            partitionKey: { name: "genre", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "itemKey", type: dynamodb.AttributeType.STRING }, // usually "ALBUM#<albumId>" or "ARTIST#<artistId>"
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

        const contentBucket = new s3.Bucket(this, "ContentBucket", {
            bucketName: `cloudtunes-content-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedOrigins: ['*'],
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
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
                CONTENT_BUCKET: contentBucket.bucketName,
                ARTIST_TABLE: artistTable.tableName,
                GENRES_TABLE: genresTable.tableName,
                CONTENT_ARTIST_TABLE: contentArtistMap.tableName,
                RATING_TABLE: ratingTable.tableName,
                SUBSCRIPTION_TABLE: subscriptionTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY!
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
        const getArtistsLambda = new lambdaNode.NodejsFunction(
            this,
            "getArtists",
            commonLambdaProps("lib/lambdas/get-artists.ts")
        );
        const getAlbumsLambda = new lambdaNode.NodejsFunction(
            this,
            "getAlbums",
            commonLambdaProps("lib/lambdas/get-albums.ts")
        );
        genresTable.grantReadData(getAlbumsLambda);
        contentTable.grantReadData(getAlbumsLambda);
        artistTable.grantReadWriteData(createArtistLambda);
        artistTable.grantReadData(getArtistsLambda)
        artistTable.grantReadData(getArtistLambda);
        genresTable.grantReadData(getArtistsByGenreLambda);
        genresTable.grantWriteData(createArtistLambda);

        const getAlbumsByGenreLambda = new lambdaNode.NodejsFunction(
            this,
            "getAlbumsByGenre",
            commonLambdaProps("lib/lambdas/get-albums-by-genre.ts")
        );
        genresTable.grantReadData(getAlbumsByGenreLambda);

        const getGenres = new lambdaNode.NodejsFunction(
            this,
            "getGenres",
            commonLambdaProps("lib/lambdas/get-genres.ts")
        );
        genresTable.grantReadData(getGenres);

        const uploadContentLambda = new lambdaNode.NodejsFunction(
            this,
            "uploadContent",
            commonLambdaProps("lib/lambdas/upload-content.ts", 10)
        );
        const getContentLambda = new lambdaNode.NodejsFunction(
            this,
            "getContent",
            commonLambdaProps("lib/lambdas/get-content.ts")
        );
        const editContentLambda = new lambdaNode.NodejsFunction(
            this,
            "editContent",
            commonLambdaProps("lib/lambdas/edit-content.ts", 10)
        );
        const deleteContentLambda = new lambdaNode.NodejsFunction(
            this,
            "deleteContent",
            commonLambdaProps("lib/lambdas/delete-content.ts")
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
        genresTable.grantWriteData(uploadContentLambda);
        contentArtistMap.grantReadWriteData(uploadContentLambda);
        contentBucket.grantReadWrite(uploadContentLambda);

        contentTable.grantReadWriteData(editContentLambda);
        genresTable.grantWriteData(editContentLambda);
        contentArtistMap.grantReadWriteData(editContentLambda);
        contentBucket.grantReadWrite(editContentLambda);

        contentTable.grantReadWriteData(deleteContentLambda);
        contentArtistMap.grantReadWriteData(deleteContentLambda);
        contentBucket.grantReadWrite(deleteContentLambda);

        contentTable.grantReadData(getContentLambda);
        contentBucket.grantRead(getContentLambda);

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
        const getRatingByUserLambda = new lambdaNode.NodejsFunction(this, "getRatingByUser",
            commonLambdaProps("lib/lambdas/get-rating-by-user.ts")
        );

        ratingTable.grantReadWriteData(rateContentLambda);
        ratingTable.grantReadData(getRatingsByContentLambda);
        ratingTable.grantReadData(getRatingByUserLambda);

        const subscribeLambda = new lambdaNode.NodejsFunction(
            this,
            "subscribe",
            commonLambdaProps("lib/lambdas/subscribe.ts")
        );
        subscriptionTable.grantReadWriteData(subscribeLambda);

        const transcriptionLambda = new lambdaNode.NodejsFunction(
            this,
            "transcription",
            commonLambdaProps("lib/lambdas/transcription.ts")
        );
        contentTable.grantReadWriteData(transcriptionLambda);
        contentBucket.grantRead(transcriptionLambda);

        // API Gateway
        const api = new RestApi(this, "cloudtunes-api");

        // GET and POST /artists
        const artists = api.root.addResource("artists");
        addCorsOptions(artists, ["POST", "GET"]);
        addMethodWithLambda(artists, "GET", getArtistsLambda);
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

        // Add: GET /albums
        const albums = api.root.addResource("albums");
        addCorsOptions(albums, ["GET"]);
        addMethodWithLambda(albums, "GET", getAlbumsLambda);

        // GET /albums/genre/{genre}
        const albumsByGenre = albums.addResource("genre").addResource("{genre}");
        addCorsOptions(albumsByGenre, ["GET"]);
        addMethodWithLambda(
            albumsByGenre,
            "GET",
            getAlbumsByGenreLambda,
            requestTemplate().path("genre").build()
        );

        const genres = api.root.addResource("genres");
        addCorsOptions(genres, ["GET"]);
        addMethodWithLambda(
            genres,
            "GET",
            getGenres,
        );

        // POST /contents
        const contents = api.root.addResource("contents");
        addCorsOptions(contents, ["POST"]);
        const uploadContentTmpl = requestTemplate()
            .body("title")
            .body("imageUrl")
            .body("albumId")
            .body("albumName")
            .body("genres")
            .body("artistIds")
            .body("fileBase64")
            .build();
        addMethodWithLambda(
            contents,
            "POST",
            uploadContentLambda,
            uploadContentTmpl,
            api.addModel("UploadContentModel", uploadContentModelOptions)
        );

        // GET /contents/{contentId}
        const singleContent = contents.addResource("{contentId}");
        addCorsOptions(singleContent, ["GET", "PUT", "DELETE"]);
        addMethodWithLambda(
            singleContent,
            "GET",
            getContentLambda,
            requestTemplate().path("contentId").build()
        );
        // PUT /contents/{contentId}
        const editContentTmpl = requestTemplate()
            .path("contentId")
            .body("title")
            .body("imageUrl")
            .body("albumId")
            .body("albumName")
            .body("genres")
            .body("artistIds")
            .body("fileBase64")
            .build();
        addMethodWithLambda(
            singleContent,
            "PUT",
            editContentLambda,
            editContentTmpl
        );
        // DELETE /contents/{contentId}
        addMethodWithLambda(
            singleContent,
            "DELETE",
            deleteContentLambda,
            requestTemplate().path("contentId").build()
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
        // GET /ratings/content/{contentId}/user/{userId}
        const ratingByUser = ratingsByContent.addResource("user").addResource("{userId}");
        addCorsOptions(ratingByUser, ["GET"]);
        addMethodWithLambda(
            ratingByUser,
            "GET",
            getRatingByUserLambda,
            requestTemplate().path("contentId").path("userId").build()
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
        new cdk.CfnOutput(this, "ContentBucketName", { value: contentBucket.bucketName });
        new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    }
}
