import { test, expect, chromium } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', '..');

// Phase 3 検証ポイント:
// - content.js にサイドバー関連定数が含まれる
// - constants.js のSIDEBAR定数が正しい値を持つ
// - settings.js のデフォルト AI 指示文が正しい

let context;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => {});
});

test.afterAll(async () => {
  await context.close();
});

test('content.js にサイドバー用のShadow DOM実装が含まれる', async () => {
  const { readFileSync } = await import('fs');
  const content = readFileSync(join(EXTENSION_PATH, 'content/content.js'), 'utf-8');

  // Shadow DOM 実装の確認
  expect(content).toContain('attachShadow');
  expect(content).toContain('mdreview-shadow-host');
  expect(content).toContain('mdreview-sidebar');
  expect(content).toContain('Markdown Review');

  // サイドバー機能の確認
  expect(content).toContain('expandSidebar');
  expect(content).toContain('hideSidebar');
  expect(content).toContain('toggleSidebar');
  expect(content).toContain('renderSidebar');
  expect(content).toContain('renderComments');
});

test('content.js にコメントCRUD機能が含まれる', async () => {
  const { readFileSync } = await import('fs');
  const content = readFileSync(join(EXTENSION_PATH, 'content/content.js'), 'utf-8');

  expect(content).toContain('addReviewItem');
  expect(content).toContain('updateReviewItem');
  expect(content).toContain('deleteReviewItem');
  expect(content).toContain('loadReviews');
  expect(content).toContain('generateMarkdown');
});

test('constants.js の SIDEBAR 定数が正しい', async () => {
  const { SIDEBAR } = await import('../../lib/constants.js');

  expect(SIDEBAR.WIDTH).toBe('380px');
  expect(SIDEBAR.ID).toBe('mdreview-sidebar');
  expect(SIDEBAR.SHADOW_HOST_ID).toBe('mdreview-shadow-host');
});

test('constants.js のデフォルト AI 指示文が正しい', async () => {
  const { DEFAULTS } = await import('../../lib/constants.js');
  expect(DEFAULTS.AI_PROMPT_SUFFIX).toContain('Markdown');
  expect(DEFAULTS.AI_PROMPT_SUFFIX.length).toBeGreaterThan(10);
});

test('background/service-worker.js がトグル処理のみを持つ', async () => {
  const { readFileSync } = await import('fs');
  const content = readFileSync(join(EXTENSION_PATH, 'background/service-worker.js'), 'utf-8');

  // トグル機能の確認
  expect(content).toContain('chrome.action.onClicked');
  expect(content).toContain('toggleSidebar');

  // ポップアップ向けメッセージリレーは不要
  expect(content).not.toContain('GET_LATEST_SELECTION');
  expect(content).not.toContain('latestSelections');
});
