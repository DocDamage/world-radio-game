import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import http from 'node:http'
import https from 'node:https'

function streamProxyPlugin(): Plugin {
  return {
    name: 'stream-proxy',
    configureServer(server) {
      server.middlewares.use('/stream-proxy', (req, res) => {
        const urlParams = new URL(req.url || '', `http://${req.headers.host}`);
        const targetUrl = urlParams.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        try {
          const parsed = new URL(targetUrl);
          const client = parsed.protocol === 'https:' ? https : http;

          const proxyReq = client.get(
            targetUrl,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                Accept: '*/*',
                'Icy-MetaData': '1'
              }
            },
            proxyRes => {
              // Handle redirects
              if (
                proxyRes.statusCode &&
                proxyRes.statusCode >= 300 &&
                proxyRes.statusCode < 400 &&
                proxyRes.headers.location
              ) {
                res.writeHead(302, {
                  Location: `/stream-proxy?url=${encodeURIComponent(proxyRes.headers.location)}`,
                  'Access-Control-Allow-Origin': '*'
                });
                res.end();
                return;
              }

              res.writeHead(proxyRes.statusCode || 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg'
              });

              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', err => {
            console.warn('Stream proxy upstream error:', err.message);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.end('Upstream stream error');
            }
          });
        } catch (err: any) {
          res.statusCode = 500;
          res.end(`Proxy exception: ${err.message}`);
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), streamProxyPlugin()],
})
