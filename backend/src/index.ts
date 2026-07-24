import { createExpressApp } from './server';

const PORT = process.env.PORT || 5000;
const app = createExpressApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Express] Red Apple Backend API running on port ${PORT}`);
  });
}

export { app };
