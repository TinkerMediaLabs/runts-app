#!/bin/bash
# deploy-notifications.sh
# Deploys the notify-new-story notification infrastructure:
#   - IAM role + policy
#   - Lambda function (compiled from TypeScript)
#   - SQS queue with 1-hour delay
#   - DynamoDB Stream trigger (Stream → SQS → Lambda)
#
# Run from project root: bash scripts/deploy-notifications.sh
# Requires: aws-cli, node, npm, tsc

set -e

REGION="us-east-2"
ACCOUNT_ID="147723036453"
PROD_API_ID="nzvkuznrzjfc5kud3vfik5j7ey"
FUNCTION_NAME="runts-notify-new-story"
LAMBDA_DIR="amplify/functions/notify-new-story"
STORY_TABLE="Story-${PROD_API_ID}-NONE"
FOLLOWED_AUTHOR_TABLE="UserFollowedAuthor-${PROD_API_ID}-NONE"
USER_DEVICE_TABLE="UserDevice-${PROD_API_ID}-NONE"
AUTHOR_TABLE="Author-${PROD_API_ID}-NONE"
QUEUE_NAME="runts-notify-new-story-queue"

echo "🚀 Deploying notify-new-story notification infrastructure..."

# ── 1. Compile TypeScript ─────────────────────────────────────────────────────
echo "📦 Compiling TypeScript..."
cd $LAMBDA_DIR
npm install --silent
npx tsc handler.ts --module commonjs --target es2020 --esModuleInterop true --outDir . 2>/dev/null || true
cd -

# ── 2. Zip Lambda ─────────────────────────────────────────────────────────────
echo "🗜  Zipping Lambda..."
cd $LAMBDA_DIR
zip -r /tmp/notify-lambda.zip . -x "*.ts" -x "tsconfig*" > /dev/null
cd -
echo "Lambda zip created"

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
    --role-name RuntsNotifyLambdaRole \
    --assume-role-policy-document "$TRUST_POLICY" \
    --query 'Role.Arn' \
    --output text 2>/dev/null) || \
ROLE_ARN=$(aws iam get-role \
    --role-name RuntsNotifyLambdaRole \
    --query 'Role.Arn' \
    --output text)

echo "Role ARN: $ROLE_ARN"

aws iam attach-role-policy \
    --role-name RuntsNotifyLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || true

aws iam attach-role-policy \
    --role-name RuntsNotifyLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole \
    2>/dev/null || true

aws iam put-role-policy \
    --role-name RuntsNotifyLambdaRole \
    --policy-name RuntsNotifyPolicy \
    --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Effect\": \"Allow\",
      \"Action\": [\"dynamodb:Scan\", \"dynamodb:GetItem\", \"dynamodb:Query\"],
      \"Resource\": [
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${STORY_TABLE}\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${FOLLOWED_AUTHOR_TABLE}\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${USER_DEVICE_TABLE}\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${AUTHOR_TABLE}\"
      ]
    },
    {
      \"Effect\": \"Allow\",
      \"Action\": [\"dynamodb:GetRecords\", \"dynamodb:GetShardIterator\", \"dynamodb:DescribeStream\", \"dynamodb:ListStreams\"],
      \"Resource\": \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${STORY_TABLE}/stream/*\"
    },
    {
      \"Effect\": \"Allow\",
      \"Action\": [\"sqs:SendMessage\", \"sqs:ReceiveMessage\", \"sqs:DeleteMessage\", \"sqs:GetQueueAttributes\"],
      \"Resource\": \"arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${QUEUE_NAME}\"
    }
  ]
}"

echo "Waiting for IAM to propagate..."
sleep 10

# ── 4. Create Lambda ──────────────────────────────────────────────────────────
echo "⚡ Creating Lambda function..."

EXISTING=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null && echo "yes" || echo "no")

if [ "$EXISTING" = "yes" ]; then
    echo "Updating existing Lambda..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb:///tmp/notify-lambda.zip \
        --region $REGION > /dev/null
else
    echo "Creating new Lambda..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler handler.handler \
        --zip-file fileb:///tmp/notify-lambda.zip \
        --timeout 60 \
        --memory-size 256 \
        --region $REGION > /dev/null
fi

LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"
echo "Lambda ARN: $LAMBDA_ARN"

# ── 5. Create SQS queue with 1-hour delay ────────────────────────────────────
echo "📬 Creating SQS queue with 1-hour delay..."

QUEUE_URL=$(aws sqs get-queue-url \
    --queue-name $QUEUE_NAME \
    --region $REGION \
    --query 'QueueUrl' \
    --output text 2>/dev/null) || \
QUEUE_URL=$(aws sqs create-queue \
    --queue-name $QUEUE_NAME \
    --attributes '{
        "DelaySeconds": "3600",
        "VisibilityTimeout": "120",
        "MessageRetentionPeriod": "86400"
    }' \
    --region $REGION \
    --query 'QueueUrl' \
    --output text)

echo "Queue URL: $QUEUE_URL"

QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${QUEUE_NAME}"

# ── 6. Wire SQS → Lambda ──────────────────────────────────────────────────────
echo "🔗 Wiring SQS → Lambda..."

aws lambda create-event-source-mapping \
    --function-name $FUNCTION_NAME \
    --event-source-arn $QUEUE_ARN \
    --batch-size 10 \
    --region $REGION \
    2>/dev/null || echo "Event source mapping already exists"

# ── 7. Enable DynamoDB Stream on Story table ──────────────────────────────────
echo "📡 Enabling DynamoDB Stream on Story table..."

STREAM_ARN=$(aws dynamodb describe-table \
    --table-name $STORY_TABLE \
    --region $REGION \
    --query 'Table.LatestStreamArn' \
    --output text 2>/dev/null)

if [ "$STREAM_ARN" = "None" ] || [ -z "$STREAM_ARN" ]; then
    aws dynamodb update-table \
        --table-name $STORY_TABLE \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --region $REGION > /dev/null
    echo "Waiting for stream to enable..."
    sleep 15
    STREAM_ARN=$(aws dynamodb describe-table \
        --table-name $STORY_TABLE \
        --region $REGION \
        --query 'Table.LatestStreamArn' \
        --output text)
fi

echo "Stream ARN: $STREAM_ARN"

# ── 8. Create pipe: DynamoDB Stream → SQS ────────────────────────────────────
# We use a Lambda as a stream processor that writes to SQS
# Create a second Lambda (stream-to-sqs) that reads stream and writes to SQS

STREAM_PROCESSOR="runts-notify-story-stream"

cat > /tmp/stream-processor.js << 'JSEOF'
'use strict';
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs      = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.QUEUE_URL;

exports.handler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== 'MODIFY') continue;

        const oldImage = record.dynamodb?.OldImage;
        const newImage = record.dynamodb?.NewImage;
        if (!oldImage || !newImage) continue;

        const oldLive = oldImage.live?.S;
        const newLive = newImage.live?.S;

        // Only process when live flips false → true
        if (oldLive === 'true' || newLive !== 'true') continue;

        // Skip erotic
        if (newImage.isErotic?.S === 'true') continue;

        console.log('Story went live, queueing notification:', newImage.id?.S);

        await sqs.send(new SendMessageCommand({
            QueueUrl:    QUEUE_URL,
            MessageBody: JSON.stringify({
                storyId:  newImage.id?.S,
                authorId: newImage.authorId?.S,
                title:    newImage.title?.S,
                isErotic: newImage.isErotic?.S,
            }),
        }));
    }
};
JSEOF

mkdir -p /tmp/stream-processor-pkg
cp /tmp/stream-processor.js /tmp/stream-processor-pkg/handler.js
cd /tmp/stream-processor-pkg
npm init -y > /dev/null
npm install @aws-sdk/client-sqs --silent
zip -r /tmp/stream-processor.zip . > /dev/null
cd -

echo "⚡ Deploying stream processor Lambda..."

EXISTING2=$(aws lambda get-function --function-name $STREAM_PROCESSOR --region $REGION 2>/dev/null && echo "yes" || echo "no")

if [ "$EXISTING2" = "yes" ]; then
    aws lambda update-function-code \
        --function-name $STREAM_PROCESSOR \
        --zip-file fileb:///tmp/stream-processor.zip \
        --region $REGION > /dev/null
    aws lambda update-function-configuration \
        --function-name $STREAM_PROCESSOR \
        --environment "Variables={QUEUE_URL=$QUEUE_URL}" \
        --region $REGION > /dev/null
else
    aws lambda create-function \
        --function-name $STREAM_PROCESSOR \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler handler.handler \
        --zip-file fileb:///tmp/stream-processor.zip \
        --timeout 60 \
        --memory-size 128 \
        --environment "Variables={QUEUE_URL=$QUEUE_URL}" \
        --region $REGION > /dev/null
fi

# ── 9. Wire DynamoDB Stream → stream processor Lambda ─────────────────────────
echo "🔗 Wiring DynamoDB Stream → stream processor..."

aws lambda create-event-source-mapping \
    --function-name $STREAM_PROCESSOR \
    --event-source-arn $STREAM_ARN \
    --starting-position LATEST \
    --batch-size 10 \
    --region $REGION \
    2>/dev/null || echo "DynamoDB stream mapping already exists"

# ── 10. Clean up ──────────────────────────────────────────────────────────────
rm -f /tmp/notify-lambda.zip /tmp/stream-processor.zip /tmp/stream-processor.js
rm -rf /tmp/stream-processor-pkg

echo ""
echo "✅ Notification infrastructure deployed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Story table stream → stream processor Lambda"
echo "  → SQS queue (1-hour delay)"
echo "  → notify-new-story Lambda"
echo "  → Expo Push API → FCM/APNs → device"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To test: flip any non-erotic story to live=true in the CMS"
echo "Check logs: aws logs tail /aws/lambda/runts-notify-new-story --region us-east-2 --follow"