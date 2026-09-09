const http = require('http');

const SUPABASE_HOST = '185.225.22.183';
const SUPABASE_PORT = 8000;
const PROXY_PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer, Content-Profile');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const options = {
    hostname: SUPABASE_HOST,
    port: SUPABASE_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${SUPABASE_HOST}:${SUPABASE_PORT}`
    },
    timeout: 30000
  };

  const proxy = http.request(options, (proxyRes) => {
    // Remove headers that might cause issues
    const headers = { ...proxyRes.headers };
    delete headers['content-security-policy'];
    delete headers['x-frame-options'];
    
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  proxy.on('timeout', () => {
    proxy.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway Timeout' }));
  });

  req.pipe(proxy);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Supabase proxy running on port ${PROXY_PORT}`);
});
