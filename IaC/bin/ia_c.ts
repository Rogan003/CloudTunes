#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/stack/cloud_tunes-stack';

const app = new cdk.App();

new AppStack(app, 'AppStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
    },
});