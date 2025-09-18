#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/stack/cloud_tunes-stack';

const app = new cdk.App();

new AuthStack(app, 'AuthStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
    },
});