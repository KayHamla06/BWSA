import 'dotenv/config';
import { createServer } from 'http';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(async () => {
    try {
      const { assertJwtConfiguration } = await import('./lib/jwt.js');
      assertJwtConfiguration();
    } catch (error) {
      console.error(`Startup configuration error: ${error.message}`);
      process.exit(1);
    }

    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`Ubuntu Market server running at http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
