import { createExpressApp } from './server';

import { userStore } from './data/user.store';

import { cronWorker } from './services/cronWorker.service';
import { createServer } from 'http';
import { attachGeminiLiveProxy } from './services/geminiLiveProxy.service';

const PORT = process.env.PORT || 5000;
const app = createExpressApp();
const server = createServer(app);
attachGeminiLiveProxy(server);

if (require.main === module) {
  userStore.init().then(() => {
    server.listen(PORT, () => {
      console.log(`[Express] Red Apple Backend API running on port ${PORT}`);
      cronWorker.start();
    });
  });
}

export { app };
