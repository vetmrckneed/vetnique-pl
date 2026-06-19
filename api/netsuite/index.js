const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function pct(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuthHeader(method, baseUrl, accountId, consumerKey, consumerSecret, tokenKey, tokenSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: tokenKey,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(params).sort()
    .map(k => `${pct(k)}=${pct(params[k])}`).join('&');

  const baseString = `${method}&${pct(baseUrl)}&${pct(paramString)}`;
  const signingKey = `${pct(consumerSecret)}&${pct(tokenSecret)}`;

  params.oauth_signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');

  const headerValue = Object.keys(params)
    .map(k => `${k}="${pct(params[k])}"`)
    .join(', ');

  return `OAuth realm="${accountId}", ${headerValue}`;
}

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS };
    return;
  }

  const { sqlQuery, pageSize = 1000, pageIndex = 0 } = req.body || {};
  if (!sqlQuery) {
    context.res = { status: 400, headers: CORS, body: { error: 'sqlQuery required' } };
    return;
  }

  const accountId      = process.env.NS_ACCOUNT_ID;
  const consumerKey    = process.env.NS_CONSUMER_KEY;
  const consumerSecret = process.env.NS_CONSUMER_SECRET;
  const tokenKey       = process.env.NS_TOKEN_KEY;
  const tokenSecret    = process.env.NS_TOKEN_SECRET;

  if (!accountId || !consumerKey) {
    context.res = { status: 500, headers: CORS, body: { error: 'NetSuite credentials not configured' } };
    return;
  }

  const baseUrl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
  const offset  = pageIndex * pageSize;
  const url     = `${baseUrl}?limit=${pageSize}&offset=${offset}`;

  const authHeader = buildOAuthHeader('POST', baseUrl, accountId, consumerKey, consumerSecret, tokenKey, tokenSecret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
      body: JSON.stringify({ q: sqlQuery }),
    });

    if (!response.ok) {
      const err = await response.text();
      context.res = { status: response.status, headers: CORS, body: { error: err } };
      return;
    }

    const json = await response.json();
    context.res = {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: {
        data: json.items || [],
        resultCount: json.totalResults || (json.items || []).length,
      },
    };
  } catch (e) {
    context.res = { status: 500, headers: CORS, body: { error: e.message } };
  }
};
