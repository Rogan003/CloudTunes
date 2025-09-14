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
}