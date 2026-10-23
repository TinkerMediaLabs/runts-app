#!/bin/bash
# update-publish-lambda.sh — redeploy ONLY the code + IAM policy of the publish-to-production Lambda.
# Does NOT create a new API key or touch environment variables (deploy-publish-lambda.sh does, and
# running it would break the CMS Publish button). Run from the project root (~/runts):
#   bash scripts/update-publish-lambda.sh
set -e
REGION="us-east-2"
ACCOUNT_ID="147723036453"
FUNCTION_NAME="runts-publish-to-production"
ROLE_NAME="RuntsPublishLambdaRole"
STG="5ojmsd7i5nbq5foh2wefkdhj3e"
PRD="nzvkuznrzjfc5kud3vfik5j7ey"

[ -f scripts/publish-lambda/handler.js ] || { echo "Run this from the project root (~/runts)"; exit 1; }

echo "Current IAM policy (for the record):"
aws iam get-role-policy --role-name $ROLE_NAME --policy-name RuntsPublishPolicy --query PolicyDocument --output json || echo "(none found)"

RES=""
for ENV in $STG $PRD; do
  for M in Story Author Narrator Universe Tag StoryTag StoryNarrator StoryScene; do
    RES="$RES\"arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$M-$ENV-NONE\",\"arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$M-$ENV-NONE/index/*\","
  done
done
RES="${RES%,}"

aws iam put-role-policy --role-name $ROLE_NAME --policy-name RuntsPublishPolicy --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {\"Effect\": \"Allow\",
     \"Action\": [\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\",\"dynamodb:Scan\"],
     \"Resource\": [$RES]},
    {\"Effect\": \"Allow\", \"Action\": [\"s3:GetObject\"],
     \"Resource\": \"arn:aws:s3:::amplify-runts-staging-san-runtsstoragebucketf8df8e-ixeas7ief3e3/*\"},
    {\"Effect\": \"Allow\", \"Action\": [\"s3:PutObject\",\"s3:GetObject\"],
     \"Resource\": \"arn:aws:s3:::amplify-di214r77g48tp-pro-runtsstoragebucketf8df8e-dwm5plyozk1b/*\"}
  ]
}"
echo "IAM policy updated."

( cd scripts/publish-lambda && npm install --production --silent && rm -f ../publish-lambda.zip && zip -qr ../publish-lambda.zip . -x "*.sh" )
aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://scripts/publish-lambda.zip --region $REGION --query '[FunctionName,LastModified,CodeSize]' --output text
echo "Done. Lambda code updated (API key and env vars untouched)."
