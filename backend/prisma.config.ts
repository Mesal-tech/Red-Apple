import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Prisma CLI (migrations) requires the direct unpooled connection
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
