import { defineConfig } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        channel: 'chromium',
        launchOptions: {
          args: [
            `--disable-extensions-except=${join(__dirname)}`,
            `--load-extension=${join(__dirname)}`,
          ],
        },
      },
    },
  ],
});
