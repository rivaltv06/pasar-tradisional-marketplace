/**
 * local server entry file, for local development
 */
import app from './app.js';
import type { Server } from 'node:http';

/**
 * start server with port
 */
const START_PORT = Number(process.env.PORT || 3002);

function start(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const s = app.listen(port, () => resolve(s));
    s.on('error', reject);
  });
}

let server: Server;

(async () => {
  let port = START_PORT;
  while (true) {
    try {
      server = await start(port);
      console.log(`Server ready on port ${port}`);
      break;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'EADDRINUSE') {
        port += 1;
        continue;
      }
      throw e;
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server?.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server?.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
