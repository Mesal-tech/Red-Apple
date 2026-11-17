import { createExpressApp } from './server';

import { userStore } from './data/user.store';

import { notificationDispatcher } from './notifications/notification.service';
import { createServer } from 'http';
import { attachGeminiLiveProxy } from './services/geminiLiveProxy.service';

const PORT = process.env.PORT || 5001;
const app = createExpressApp();
const server = createServer(app);
attachGeminiLiveProxy(server);

if (require.main === module) {
  userStore.init().then(() => {
    server.listen(PORT, () => {
      console.log(`[Express] Red Apple Backend API running on port ${PORT}`);
      notificationDispatcher.start();
    });
  });

  const shutdown = async () => {
    await notificationDispatcher.stop();
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export { app };
