import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { parseRoute, isShowable, coverPath, buildPage, DEFAULT_ICON, type PreviewStory } from './preview';

const dynamo = new DynamoDBClient({});
const SITE = process.env.SITE_ORIGIN || 'https://tinkermedia.net';
const SCHEME = process.env.APP_SCHEME || 'runts';

async function getStory(id: string): Promise<PreviewStory | null> {
  const table = process.env.STORY_TABLE_NAME;
  if (!table) throw new Error('Not configured');
  const res = await dynamo.send(new GetItemCommand({
    TableName: table, Key: { id: { S: id } },
    ProjectionExpression: 'id, title, summary, authorId, imageUri, live, isErotic, #d',
    ExpressionAttributeNames: { '#d': 'duration' },
  }));
  return res.Item ? (unmarshall(res.Item) as PreviewStory) : null;
}

async function getAuthorName(authorId: unknown): Promise<string> {
  const table = process.env.AUTHOR_TABLE_NAME;
  if (!table || typeof authorId !== 'string' || !authorId) return '';
  try {
    const res = await dynamo.send(new GetItemCommand({ TableName: table, Key: { id: { S: authorId } }, ProjectionExpression: '#n', ExpressionAttributeNames: { '#n': 'name' } }));
    return res.Item?.name?.S ?? '';
  } catch { return ''; }
}

const html = (body: string, maxAge: number) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}` },
  body,
});

// GET /story/<id>: the preview page. GET /image/<id>: redirects to the story's cover (a fresh signed link), or to the
// Runts icon when the story has none or is not shareable.
export const handler = async (event: any) => {
  const route = parseRoute(event.rawPath);
  const host = event.requestContext?.domainName;
  const selfOrigin = host ? `https://${host}` : SITE;

  if (!route) return html(buildPage({ story: null, pageUrl: SITE, imageUrl: null, appLink: `${SCHEME}://` }), 300);

  let story: PreviewStory | null = null;
  try { story = await getStory(route.id); } catch { story = null; }

  if (route.kind === 'image') {
    const path = coverPath(story);
    const domain = process.env.AUDIO_CDN_DOMAIN, keyPairId = process.env.AUDIO_KEY_PAIR_ID, keyB64 = process.env.CLOUDFRONT_PRIVATE_KEY_B64;
    let location = DEFAULT_ICON;
    if (path && domain && keyPairId && keyB64) {
      const url = `https://${domain}/${path.split('/').map(encodeURIComponent).join('/')}`;
      location = getSignedUrl({
        url, keyPairId, privateKey: Buffer.from(keyB64, 'base64').toString('utf8'),
        dateLessThan: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }
    return { statusCode: 302, headers: { Location: location, 'Cache-Control': 'public, max-age=60' }, body: '' };
  }

  const show = isShowable(story);
  const authorName = show ? await getAuthorName(story!.authorId) : '';
  return html(buildPage({
    story: show ? story : null,
    authorName,
    pageUrl: `${SITE}/runts/story/${route.id}`,
    imageUrl: coverPath(story) ? `${selfOrigin}/image/${route.id}` : null,
    appLink: `${SCHEME}://story/${route.id}`,
  }), show ? 300 : 60);
};
