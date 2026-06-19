const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS };
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    context.res = { status: 400, headers: CORS, body: { error: 'prompt required' } };
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    context.res = { status: 500, headers: CORS, body: { error: 'ANTHROPIC_API_KEY not configured' } };
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      context.res = { status: response.status, headers: CORS, body: { error: err } };
      return;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    context.res = {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: { text },
    };
  } catch (e) {
    context.res = { status: 500, headers: CORS, body: { error: e.message } };
  }
};
