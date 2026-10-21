#!/bin/bash
# secure-delete-user.sh - lock down the delete-user API (API Gateway 691umui6i9, Lambda runts-delete-user).
#   1. Redeploys the Lambda so it only deletes the caller's own account (from verified token claims).
#   2. Adds a Cognito user pool authorizer (dev, staging and production pools) to POST /delete-user.
#   3. Passes the verified claims to the Lambda with a request mapping template.
#   4. Redeploys the API stage.
# Run from the project root (~/runts):  bash scripts/secure-delete-user.sh
set -e
REGION="us-east-2"
ACCOUNT_ID="147723036453"
API_ID="691umui6i9"
STAGE="prod"
FUNCTION_NAME="runts-delete-user"
LAMBDA_DIR="scripts/delete-user-lambda"

[ -f $LAMBDA_DIR/index.mjs ] || { echo "Run this from the project root (~/runts)"; exit 1; }

POOL_ARNS=$(python3 - <<PY
import json
ids = []
for f in ['amplify_outputs.json', 'amplify_outputs.staging.json', 'amplify_outputs.production.json']:
    try:
        pid = json.load(open(f))['auth']['user_pool_id']
        if pid not in ids: ids.append(pid)
    except Exception as e:
        raise SystemExit('Could not read user_pool_id from ' + f + ': ' + str(e))
print(' '.join('arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/' + i for i in ids))
PY
)
echo "User pools allowed to call the API:"
echo "$POOL_ARNS" | tr ' ' '\n'

echo "Updating the Lambda..."
( cd $LAMBDA_DIR && rm -f /tmp/delete-user-lambda.zip && zip -qr /tmp/delete-user-lambda.zip index.mjs package.json )
aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb:///tmp/delete-user-lambda.zip --region $REGION --query '[FunctionName,LastModified]' --output text
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

echo "Creating the authorizer..."
AUTH_ID=$(aws apigateway get-authorizers --rest-api-id $API_ID --region $REGION --query "items[?name=='runts-cognito'].id" --output text)
if [ -z "$AUTH_ID" ] || [ "$AUTH_ID" = "None" ]; then
  AUTH_ID=$(aws apigateway create-authorizer --rest-api-id $API_ID --region $REGION --name runts-cognito --type COGNITO_USER_POOLS --provider-arns $POOL_ARNS --identity-source method.request.header.Authorization --query id --output text)
fi
echo "Authorizer id: $AUTH_ID"

RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/delete-user'].id" --output text)
echo "Resource id: $RESOURCE_ID"

echo "Requiring the authorizer on POST /delete-user..."
aws apigateway update-method --rest-api-id $API_ID --region $REGION --resource-id $RESOURCE_ID --http-method POST \
  --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS op=replace,path=/authorizerId,value=$AUTH_ID \
  --query '[authorizationType,authorizerId]' --output text

echo "Passing verified claims to the Lambda..."
python3 - <<'PY'
import json
template = ('{"claims": {'
            '"sub": "$util.escapeJavaScript($context.authorizer.claims.sub)", '
            '"username": "$util.escapeJavaScript($context.authorizer.claims[\'cognito:username\'])", '
            '"iss": "$util.escapeJavaScript($context.authorizer.claims.iss)"}}')
ops = [{"op": "add", "path": "/requestTemplates/application~1json", "value": template}]
json.dump(ops, open('/tmp/delete-user-patch.json', 'w'))
PY
aws apigateway update-integration --rest-api-id $API_ID --region $REGION --resource-id $RESOURCE_ID --http-method POST \
  --patch-operations file:///tmp/delete-user-patch.json --query 'requestTemplates' --output json
aws apigateway update-integration --rest-api-id $API_ID --region $REGION --resource-id $RESOURCE_ID --http-method POST \
  --patch-operations op=replace,path=/passthroughBehavior,value=NEVER --query passthroughBehavior --output text

echo "Deploying the API stage..."
aws apigateway create-deployment --rest-api-id $API_ID --region $REGION --stage-name $STAGE --query id --output text
echo "Done. POST /delete-user now requires a signed-in Cognito ID token and only deletes the caller."
