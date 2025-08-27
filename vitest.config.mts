import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [
      'test/unit/**/*.test.ts',
    ],
    forceRerunTriggers: [
      path.resolve(__dirname, 'syntaxes/org.tmLanguage.json'),
      path.resolve(__dirname, 'test/fixtures/**/*.org'),
      path.resolve(__dirname, 'test/unit/**/*.test.ts'),
    ],
    alias: {
      '@common': path.resolve(__dirname, './common/src'),
    },
  },
});
