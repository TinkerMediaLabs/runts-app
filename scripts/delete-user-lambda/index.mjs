import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-2' });

// Deletes the CALLING user's own Cognito account, nothing else.
// API Gateway verifies the caller's Cognito ID token (Cognito user pool authorizer) and passes the
// verified claims in `event.claims` through a mapping template. The request body is ignored, so a
// caller can never name another user or another pool.
export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };

    const claims = event?.claims;
    const username = claims?.username;
    const issuer = claims?.iss ?? '';
    const userPoolId = issuer.split('/').pop();   // https://cognito-idp.<region>.amazonaws.com/<poolId>

    if (!username || !userPoolId || !userPoolId.includes('_')) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' }),
        };
    }

    try {
        await cognito.send(new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: username,
        }));

        console.log('Deleted Cognito user', username, 'from pool', userPoolId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true }),
        };
    } catch (err) {
        console.error('Delete user error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to delete account.' }),
        };
    }
};
