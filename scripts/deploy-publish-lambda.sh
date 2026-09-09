#!/bin/bash
# deploy-publish-lambda.sh
# Deploys the publish-to-production Lambda and API Gateway
# Run from project root: bash scripts/deploy-publish-lambda.sh

set -e

REGION="us-east-2"
ACCOUNT_ID="147723036453"
FUNCTION_NAME="runts-publish-to-production"
LAMBDA_DIR="scripts/publish-lambda"
API_NAME="runts-publish-api"

echo "🚀 Deploying publish-to-production Lambda..."

# ── 1. Install Lambda dependencies ────────────────────────────────────────────
echo "📦 Installing Lambda dependencies..."
mkdir -p $LAMBDA_DIR
cp scripts/publish-lambda/handler.js $LAMBDA_DIR/handler.js 2>/dev/null || true
cd $LAMBDA_DIR
npm install --production --silent
cd -

# ── 2. Zip the Lambda ─────────────────────────────────────────────────────────
echo "🗜  Zipping Lambda..."
cd $LAMBDA_DIR
zip -r ../publish-lambda.zip . -x "*.sh" > /dev/null
cd -
echo "Zip created: scripts/publish-lambda.zip"

# ── 3. Create IAM role ────────────────────────────────────────────────────────
echo "👤 Creating IAM role..."

TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

ROLE_ARN=$(aws iam create-role \
    --role-name RuntsPublishLambdaRole \
    --assume-role-policy-document "$TRUST_POLICY" \
    --query 'Role.Arn' \
    --output text 2>/dev/null) || \
ROLE_ARN=$(aws iam get-role \
    --role-name RuntsPublishLambdaRole \
    --query 'Role.Arn' \
    --output text)

echo "Role ARN: $ROLE_ARN"

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name RuntsPublishLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || true

# Create and attach custom policy for DynamoDB + S3
POLICY_DOC=$(cat << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Scan"],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Story-nflzecthnfb2noim4kgzmddjre-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Author-nflzecthnfb2noim4kgzmddjre-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Tag-nflzecthnfb2noim4kgzmddjre-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/StoryTag-nflzecthnfb2noim4kgzmddjre-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Story-nzvkuznrzjfc5kud3vfik5j7ey-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Author-nzvkuznrzjfc5kud3vfik5j7ey-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Tag-nzvkuznrzjfc5kud3vfik5j7ey-NONE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/StoryTag-nzvkuznrzjfc5kud3vfik5j7ey-NONE"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:HeadObject"],
      "Resource": "arn:aws:s3:::amplify-runts-staging-san-runtsstoragebucketf8df8e-ixeas7ief3e3/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::amplify-di214r77g48tp-pro-runtsstoragebucketf8df8e-dwm5plyozk1b/*"
    }
  ]
}
EOF
)

aws iam put-role-policy \
    --role-name RuntsPublishLambdaRole \
    --policy-name RuntsPublishPolicy \
    --policy-document "$POLICY_DOC" \
    2>/dev/null || true

echo "Waiting for IAM role to propagate..."
sleep 10

# ── 4. Generate API key ───────────────────────────────────────────────────────
API_KEY=$(openssl rand -hex 32)
echo "🔑 Generated API key: $API_KEY"

# ── 5. Create or update Lambda function ──────────────────────────────────────
echo "⚡ Creating Lambda function..."

EXISTING=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null && echo "yes" || echo "no")

if [ "$EXISTING" = "yes" ]; then
    echo "Updating existing Lambda..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://scripts/publish-lambda.zip \
        --region $REGION > /dev/null
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "Variables={PUBLISH_API_KEY=$API_KEY}" \
        --region $REGION > /dev/null
else
    echo "Creating new Lambda..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler handler.handler \
        --zip-file fileb://scripts/publish-lambda.zip \
        --timeout 60 \
        --memory-size 256 \
        --environment "Variables={PUBLISH_API_KEY=$API_KEY}" \
        --region $REGION > /dev/null
fi

LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo "Lambda ARN: $LAMBDA_ARN"

# ── 6. Create API Gateway HTTP API ────────────────────────────────────────────
echo "🌐 Creating API Gateway..."

API_ID=$(aws apigatewayv2 get-apis \
    --region $REGION \
    --query "Items[?Name=='$API_NAME'].ApiId" \
    --output text 2>/dev/null)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    API_ID=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --cors-configuration \
            AllowOrigins='["*"]',AllowHeaders='["Content-Type","X-Api-Key"]',AllowMethods='["POST","OPTIONS"]' \
        --region $REGION \
        --query 'ApiId' \
        --output text)
    echo "Created API: $API_ID"
else
    echo "Using existing API: $API_ID"
fi

# ── 7. Create Lambda integration ──────────────────────────────────────────────
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region $REGION \
    --query 'IntegrationId' \
    --output text)

# ── 8. Create route ───────────────────────────────────────────────────────────
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'POST /publish' \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION > /dev/null 2>&1 || true

# ── 9. Create default stage ───────────────────────────────────────────────────
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name '$default' \
    --auto-deploy \
    --region $REGION > /dev/null 2>&1 || true

# ── 10. Grant API Gateway permission to invoke Lambda ─────────────────────────
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION > /dev/null 2>&1 || true

# ── 11. Output results ────────────────────────────────────────────────────────
ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/publish"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ENDPOINT: $ENDPOINT"
echo "  API_KEY:  $API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add these to runts-admin staging branch environment variables:"
echo "  VITE_PUBLISH_LAMBDA_URL=$ENDPOINT"
echo "  VITE_PUBLISH_API_KEY=$API_KEY"
echo ""
echo "Also add to Amplify Console > runts-admin > staging branch > Environment variables"
echo ""

# Clean up
rm scripts/publish-lambda.zip