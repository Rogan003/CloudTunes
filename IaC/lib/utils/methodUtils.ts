import { Duration } from "aws-cdk-lib";
import {
    IResource,
    IModel,
    LambdaIntegration,
    PassthroughBehavior,
    MockIntegration,
    IRequestValidator
} from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";

const APP_JSON = "application/json";
const ACCESS_CONTROL_ALLOW_ = "method.response.header.Access-Control-Allow-";
const ALLOW_ORIGIN_HEADER = ACCESS_CONTROL_ALLOW_ + "Origin";
const ALLOW_METHODS_HEADER = ACCESS_CONTROL_ALLOW_ + "Methods";
const ALLOW_HEADERS_HEADER = ACCESS_CONTROL_ALLOW_ + "Headers";

export function addMethodWithLambda(
  apiResource: IResource,
  httpMethod: "GET" | "PUT" | "POST" | "DELETE",
  lambda: IFunction,
  validator: IRequestValidator,
  requestTemplate?: string,
  requestModel?: IModel,
) {
  return apiResource.addMethod(
    httpMethod,
    new LambdaIntegration(lambda, {
      requestTemplates: requestTemplate ? { [APP_JSON]: requestTemplate } : {},
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
        },
        {
          statusCode: "201",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
        },
        {
          statusCode: "400",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
          selectionPattern: "4\\d\\d",
        },
        {
          statusCode: "403",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
          selectionPattern: "4\\d\\d",
        },
        {
          statusCode: "404",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
          selectionPattern: "4\\d\\d",
        },
        {
          statusCode: "409",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
          selectionPattern: "4\\d\\d",
        },
        {
          statusCode: "500",
          responseParameters: { [ALLOW_ORIGIN_HEADER]: "'*'" },
          selectionPattern: "5\\d\\d",
        },
      ],
      timeout: Duration.seconds(3),
      passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
    }),
    {
      requestModels: requestModel && { [APP_JSON]: requestModel },
      methodResponses: [
        { statusCode: "200", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "201", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "400", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "403", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "404", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "409", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
        { statusCode: "500", responseParameters: { [ALLOW_ORIGIN_HEADER]: true } },
      ],
      requestValidator: validator
    }
  );
}

export function addCorsOptions(apiResource: IResource, methods: ("GET" | "PUT" | "POST" | "DELETE")[]) {
  return apiResource.addMethod(
    "OPTIONS",
    new MockIntegration({
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            [ALLOW_ORIGIN_HEADER]: "'*'",
            [ALLOW_HEADERS_HEADER]:
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            [ALLOW_METHODS_HEADER]: `'${["OPTIONS", ...methods]}'`,
          },
        },
      ],
      // In case you want to use binary media types, uncomment the following line
      // contentHandling: ContentHandling.CONVERT_TO_TEXT,
      // In case you want to use binary media types, comment out the following line
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: { [APP_JSON]: '{"statusCode": 200}' },
    }),
    {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            [ALLOW_ORIGIN_HEADER]: true,
            [ALLOW_HEADERS_HEADER]: true,
            [ALLOW_METHODS_HEADER]: true,
          },
        },
      ],
    }
  );
}