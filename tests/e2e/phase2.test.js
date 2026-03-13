import { test, expect, chromium } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', '..');

// Phase 2 検証ポイント:
// - storage CRUD 操作が正常に動作する（Service Worker コンテキスト）
// - markdown-export.js が正しい Markdown を生成する

let context;
let serviceWorker;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null);
  if (!serviceWorker) {
    const workers = context.serviceWorkers();
    serviceWorker = workers[0] ?? null;
  }
});

test.afterAll(async () => {
  await context.close();
});

test('chrome.storage.local の CRUD 操作が正常に動作する', async () => {
  if (!serviceWorker) {
    test.skip();
    return;
  }

  const result = await serviceWorker.evaluate(async () => {
    const storageKey = 'reviews:test-owner/test-repo/docs/test.md@main';

    // クリア
    await chrome.storage.local.remove(storageKey);

    // 追加
    const id = crypto.randomUUID();
    const newComment = {
      type: 'code',
      lineNumber: 10,
      lineContent: 'const foo = bar;',
      comment: 'テストコメント',
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await chrome.storage.local.set({ [storageKey]: [newComment] });

    // 取得
    const stored = await chrome.storage.local.get(storageKey);
    const reviews = stored[storageKey] ?? [];

    // 更新
    const updated = reviews.map(r =>
      r.id === id ? { ...r, comment: '更新済みコメント', updatedAt: new Date().toISOString() } : r
    );
    await chrome.storage.local.set({ [storageKey]: updated });
    const afterUpdate = (await chrome.storage.local.get(storageKey))[storageKey];

    // 削除
    const afterDelete = afterUpdate.filter(r => r.id !== id);
    await chrome.storage.local.set({ [storageKey]: afterDelete });
    const finalReviews = (await chrome.storage.local.get(storageKey))[storageKey];

    return {
      initialCount: reviews.length,
      updatedComment: afterUpdate[0]?.comment,
      finalCount: finalReviews.length,
    };
  });

  expect(result.initialCount).toBe(1);
  expect(result.updatedComment).toBe('更新済みコメント');
  expect(result.finalCount).toBe(0);
});

test('markdown-export.js が正しい Markdown を生成する', async () => {
  const { generateMarkdown } = await import('../../lib/markdown-export.js');

  const fileInfo = {
    owner: 'testowner',
    repo: 'testrepo',
    branch: 'main',
    path: 'docs/README.md',
    filename: 'README.md',
  };

  const reviews = [
    {
      id: 'abc123',
      type: 'code',
      lineNumber: 5,
      lineContent: 'const foo = "bar";',
      comment: 'この変数名は改善できます',
      createdAt: '2026-03-13T00:00:00Z',
      updatedAt: '2026-03-13T00:00:00Z',
    },
    {
      id: 'def456',
      type: 'preview',
      selectedText: 'This is a test paragraph.',
      comment: 'より詳しく説明してください',
      createdAt: '2026-03-13T00:00:00Z',
      updatedAt: '2026-03-13T00:00:00Z',
    },
  ];

  const md = generateMarkdown(fileInfo, reviews, 'カスタム指示文');

  expect(md).toContain('# Markdown Review: README.md');
  expect(md).toContain('testowner/testrepo');
  expect(md).toContain('Branch**: main');
  expect(md).toContain('Total Comments**: 2');
  expect(md).toContain('### Comment 1 (Code L5)');
  expect(md).toContain('const foo = "bar";');
  expect(md).toContain('この変数名は改善できます');
  expect(md).toContain('### Comment 2 (Preview)');
  expect(md).toContain('This is a test paragraph.');
  expect(md).toContain('より詳しく説明してください');
  expect(md).toContain('## Summary');
  expect(md).toContain('カスタム指示文');
});
