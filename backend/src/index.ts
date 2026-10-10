import { createExpressApp } from './server';

import { userStore } from './data/user.store';

import { cronWorker } from './services/cronWorker.service';

const PORT = process.env.PORT || 5000;
const app = createExpressApp();

if (require.main === module) {
  userStore.init().then(() => {
    app.listen(PORT, () => {
      console.log(`[Express] Red Apple Backend API running on port ${PORT}`);
      cronWorker.start();
    });
  });
}

export { app };
