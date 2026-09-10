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
  build: {
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        // Long-lived, cache-stable vendor chunks for the lazy-loaded 3D stack:
        // three is shared by the globe and the 3D tiles renderer, globe.gl +
        // three-globe form the globe engine, and d3 powers its data binding.
        // Splitting them keeps chunks smaller (parallel download) and means an
        // app update never invalidates the cached vendor bytes.
        codeSplitting: {
          groups: [
            // Only the parts of three shared by the globe AND the 3D tiles
            // renderer move into the vendor chunk; tiles-exclusive three
            // modules stay with their lazy renderer chunks.
            { name: 'three', test: /node_modules[\\/]three[\\/]/, minShareCount: 2 },
            // d3 (globe.gl's data-binding stack) is captured before the globe
            // engine so it caches independently of globe.gl/three-globe.
            { name: 'd3', test: /node_modules[\\/](d3-[a-z-]+|internmap|delaunator|robust-predicates)[\\/]/ },
            { name: 'globe-engine', test: /node_modules[\\/](globe\.gl|three-globe)[\\/]/ }
          ]
        }
      }
    }
  }
})
