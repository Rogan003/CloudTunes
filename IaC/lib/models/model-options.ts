import { JsonSchemaType, ModelOptions } from "aws-cdk-lib/aws-apigateway";

export const createArtistModelOptions: ModelOptions = {
    schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
            name: { type: JsonSchemaType.STRING },
            bio: { type: JsonSchemaType.STRING },
            genre: { type: JsonSchemaType.STRING }
        },
        required: ["name", "bio", "genre"]
    }
};

export const uploadContentModelOptions: ModelOptions = {
    schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
            filename: { type: JsonSchemaType.STRING },
            filetype: { type: JsonSchemaType.STRING },
            filesize: { type: JsonSchemaType.NUMBER },
            title: { type: JsonSchemaType.STRING },
            imageUrl: { type: JsonSchemaType.STRING },
            albumId: { type: JsonSchemaType.STRING },
            albumName: { type: JsonSchemaType.STRING },
            genres: { type: JsonSchemaType.ARRAY, items: { type: JsonSchemaType.STRING } },
            artistIds: { type: JsonSchemaType.ARRAY, items: { type: JsonSchemaType.STRING } },
        },
        required: ["filename", "filetype", "filesize", "title", "imageUrl", "albumId", "albumName", "genres", "artistIds"],
    },
};

export const ratingModelOptions: ModelOptions = {
    schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
            userId: { type: JsonSchemaType.STRING },
            contentId: { type: JsonSchemaType.STRING },
            rating: { type: JsonSchemaType.NUMBER }
        },
        required: ["userId", "contentId", "rating"]
    }
};

export const subscriptionModelOptions: ModelOptions = {
    schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
            userId: { type: JsonSchemaType.STRING },
            type: { type: JsonSchemaType.STRING }, // ARTIST | ALBUM | GENRE
            targetId: { type: JsonSchemaType.STRING }
        },
        required: ["userId", "type", "targetId"]
    }
};