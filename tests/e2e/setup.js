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

  // 拡張機能の Service Worker が起動するのを待つ
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 拡張機能のIDを取得
  let extensionId;
  const targets = context.backgroundPages();
  if (targets.length > 0) {
    const url = targets[0].url();
    extensionId = url.split('/')[2];
  } else {
    // Service Worker からIDを取得
    const workers = context.serviceWorkers();
    if (workers.length > 0) {
      extensionId = workers[0].url().split('/')[2];
    }
  }

  return { context, extensionId };
}

// テスト用の公開GitHubリポジトリ URL
export const TEST_URLS = {
  // GitHub 公式の README（常に存在する）
  MD_FILE: 'https://github.com/github/docs/blob/main/README.md',
  NON_MD_FILE: 'https://github.com/github/docs/blob/main/package.json',
};
