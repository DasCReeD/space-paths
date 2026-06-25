import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    watch: {
      ignored: (p) => p.includes('userSettings.json')
    }
  },
  plugins: [
    {
      name: 'save-settings-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/get-settings' && req.method === 'GET') {
            try {
              const filePath = path.resolve(__dirname, 'userSettings.json');
              let settings = {};
              if (fs.existsSync(filePath)) {
                settings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(settings));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          } else if (req.url === '/api/save-settings' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const filePath = path.resolve(__dirname, 'userSettings.json');
                
                let currentSettings = {};
                if (fs.existsSync(filePath)) {
                  currentSettings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }
                
                const updatedSettings = { ...currentSettings };
                for (const [key, val] of Object.entries(data)) {
                  try {
                    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                      updatedSettings[key] = JSON.parse(val);
                    } else if (val === 'true') {
                      updatedSettings[key] = true;
                    } else if (val === 'false') {
                      updatedSettings[key] = false;
                    } else {
                      updatedSettings[key] = val;
                    }
                  } catch (e) {
                    updatedSettings[key] = val;
                  }
                }
                
                fs.writeFileSync(filePath, JSON.stringify(updatedSettings, null, 2), 'utf8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: './index.html',
        editor: './editor.html'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.agents/**', '**/tests/e2e/**']
  }
});
