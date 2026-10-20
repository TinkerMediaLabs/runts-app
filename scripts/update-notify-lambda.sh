#!/bin/bash
# update-notify-lambda.sh - redeploy ONLY the code + IAM policy of runts-notify-new-story.
# Does not touch the queue, the stream trigger, or the role's other policies.
# Prerequisite: the UserFollowedAuthor byAuthorId index must exist in production (deploy the app's
# production branch first). Run from the project root (~/runts):
#   bash scripts/update-notify-lambda.sh
set -e
REGION="us-east-2"
ACCOUNT_ID="147723036453"
PROD_API_ID="nzvkuznrzjfc5kud3vfik5j7ey"
FUNCTION_NAME="runts-notify-new-story"
ROLE_NAME="RuntsNotifyLambdaRole"
LAMBDA_DIR="amplify/functions/notify-new-story"
QUEUE_NAME="runts-notify-new-story-queue"
T="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table"

[ -f $LAMBDA_DIR/handler.ts ] || { echo "Run this from the project root (~/runts)"; exit 1; }

echo "Checking the byAuthorId index exists..."
aws dynamodb describe-table --table-name "UserFollowedAuthor-${PROD_API_ID}-NONE" --region $REGION \
  --query 'Table.GlobalSecondaryIndexes[].[IndexName,IndexStatus]' --output text | grep -q "byAuthorId.*ACTIVE" \
  || { echo "byAuthorId index is missing or not ACTIVE yet - deploy production first."; exit 1; }

aws iam put-role-policy --role-name $ROLE_NAME --policy-name RuntsNotifyPolicy --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {\"Effect\": \"Allow\",
     \"Action\": [\"dynamodb:GetItem\", \"dynamodb:Query\"],
     \"Resource\": [
       \"$T/Story-${PROD_API_ID}-NONE\", \"$T/Story-${PROD_API_ID}-NONE/index/*\",
       \"$T/UserFollowedAuthor-${PROD_API_ID}-NONE\", \"$T/UserFollowedAuthor-${PROD_API_ID}-NONE/index/*\",
       \"$T/UserDevice-${PROD_API_ID}-NONE\", \"$T/UserDevice-${PROD_API_ID}-NONE/index/*\",
       \"$T/Author-${PROD_API_ID}-NONE\"]},
    {\"Effect\": \"Allow\",
     \"Action\": [\"dynamodb:GetRecords\", \"dynamodb:GetShardIterator\", \"dynamodb:DescribeStream\", \"dynamodb:ListStreams\"],
     \"Resource\": \"$T/Story-${PROD_API_ID}-NONE/stream/*\"},
    {\"Effect\": \"Allow\",
     \"Action\": [\"sqs:SendMessage\", \"sqs:ReceiveMessage\", \"sqs:DeleteMessage\", \"sqs:GetQueueAttributes\"],
     \"Resource\": \"arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${QUEUE_NAME}\"}
  ]
}"
echo "IAM policy updated."

( cd $LAMBDA_DIR && npm install --silent && npx tsc handler.ts --module commonjs --target es2020 --esModuleInterop true --skipLibCheck true --outDir . )
grep -q "byAuthorId" $LAMBDA_DIR/handler.js || { echo "Compile did not produce the new handler - stopping."; exit 1; }
( cd $LAMBDA_DIR && rm -f /tmp/notify-lambda.zip && zip -qr /tmp/notify-lambda.zip . -x "*.ts" -x "tsconfig*" )
aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb:///tmp/notify-lambda.zip --region $REGION --query '[FunctionName,LastModified,CodeSize]' --output text
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
aws lambda update-function-configuration --function-name $FUNCTION_NAME --timeout 300 --region $REGION --query '[FunctionName,Timeout]' --output text
QUEUE_URL=$(aws sqs get-queue-url --queue-name $QUEUE_NAME --region $REGION --query QueueUrl --output text)
aws sqs set-queue-attributes --queue-url "$QUEUE_URL" --attributes VisibilityTimeout=1800 --region $REGION
MAPPING_UUID=$(aws lambda list-event-source-mappings --function-name $FUNCTION_NAME --region $REGION --query 'EventSourceMappings[0].UUID' --output text)
aws lambda update-event-source-mapping --uuid "$MAPPING_UUID" --batch-size 1 --region $REGION --query '[UUID,BatchSize]' --output text
echo "Done. Lambda code, timeout (300s), queue visibility (1800s) and batch size (1) updated."
