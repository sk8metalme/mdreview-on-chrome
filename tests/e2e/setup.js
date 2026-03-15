import { chromium } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', '..');

/**
 * Chrome拡張を読み込んだブラウザコンテキストを生成
 */
export async function launchBrowserWithExtension() {
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Service Worker の起動をイベントベースで待機
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
  }

  // 拡張機能のIDを取得
  let extensionId;
  const targets = context.backgroundPages();
  if (targets.length > 0) {
    extensionId = targets[0].url().split('/')[2];
  } else if (serviceWorker) {
    extensionId = serviceWorker.url().split('/')[2];
  }

  if (!extensionId) {
    await context.close();
    throw new Error('Extension ID could not be resolved');
  }

  return { context, extensionId };
}

// テスト用の公開GitHubリポジトリ URL
export const TEST_URLS = {
  // GitHub 公式の README（常に存在する）
  MD_FILE: 'https://github.com/github/docs/blob/main/README.md',
  NON_MD_FILE: 'https://github.com/github/docs/blob/main/package.json',
};
