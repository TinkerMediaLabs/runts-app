#!/bin/bash
# update-notify-stream-lambda.sh - redeploy ONLY the code of runts-notify-story-stream from the repo.
# Does not touch its environment, role, or the Story stream trigger. Run from ~/runts:
#   bash scripts/update-notify-stream-lambda.sh
set -e
REGION="us-east-2"
FUNCTION_NAME="runts-notify-story-stream"
LAMBDA_DIR="amplify/functions/notify-story-stream"

[ -f $LAMBDA_DIR/handler.ts ] || { echo "Run this from the project root (~/runts)"; exit 1; }

( cd $LAMBDA_DIR && npm install --silent && npx tsc handler.ts --module commonjs --target es2020 --esModuleInterop true --skipLibCheck true --outDir . )
grep -q "SendMessageCommand" $LAMBDA_DIR/handler.js || { echo "Compile did not produce the handler - stopping."; exit 1; }
( cd $LAMBDA_DIR && rm -f /tmp/notify-stream-lambda.zip && zip -qr /tmp/notify-stream-lambda.zip . -x "*.ts" -x "tsconfig*" )
aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb:///tmp/notify-stream-lambda.zip --region $REGION --query '[FunctionName,LastModified,CodeSize]' --output text
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
echo "Done. Stream Lambda code updated."
