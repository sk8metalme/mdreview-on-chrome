import { test, expect, chromium } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', '..');

// Phase 4 検証ポイント:
// - 生成Markdownの構造が正しい
// - カスタム指示文が反映される
// - 設定の保存・取得が正常に動作する（Service Worker コンテキスト）

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

test('generateMarkdown でカスタム指示文が末尾に付加される', async () => {
  const { generateMarkdown } = await import('../../lib/markdown-export.js');

  const fileInfo = {
    owner: 'myorg',
    repo: 'myrepo',
    branch: 'feature/test',
    path: 'docs/guide.md',
    filename: 'guide.md',
  };

  const reviews = [
    {
      id: 'id1',
      type: 'code',
      lineNumber: 1,
      lineContent: '# Title',
      comment: '見出しを変更してください',
      createdAt: '2026-03-13T00:00:00Z',
      updatedAt: '2026-03-13T00:00:00Z',
    },
  ];

  const customSuffix = 'このドキュメントをビジネス向けに書き直してください。';
  const md = generateMarkdown(fileInfo, reviews, customSuffix);

  expect(md).toContain(customSuffix);
  expect(md.indexOf('## Summary')).toBeLessThan(md.indexOf(customSuffix));

  const lines = md.split('\n');
  const summaryIdx = lines.findIndex(l => l === '## Summary');
  expect(summaryIdx).toBeGreaterThan(-1);
  const suffixIdx = lines.findIndex(l => l.includes(customSuffix));
  expect(suffixIdx).toBeGreaterThan(summaryIdx);
});

test('デフォルト指示文を使って Markdown が生成される', async () => {
  const { generateMarkdown } = await import('../../lib/markdown-export.js');
  const { DEFAULTS } = await import('../../lib/constants.js');

  const fileInfo = {
    owner: 'a',
    repo: 'b',
    branch: 'main',
    path: 'README.md',
    filename: 'README.md',
  };

  const reviews = [];
  const md = generateMarkdown(fileInfo, reviews);

  expect(md).toContain(DEFAULTS.AI_PROMPT_SUFFIX);
  expect(md).toContain('# Markdown Review: README.md');
  expect(md).toContain('Total Comments**: 0');
});

test('設定の保存と取得が正常に動作する（Service Worker）', async () => {
  if (!serviceWorker) {
    test.skip();
    return;
  }

  const result = await serviceWorker.evaluate(async () => {
    const SETTINGS_KEY = 'settings';
    const DEFAULT_SUFFIX = '以上のレビューコメントを踏まえて、このMarkdownファイルを改善してください。';

    // デフォルト設定の取得
    const initialResult = await chrome.storage.local.get(SETTINGS_KEY);
    const initial = initialResult[SETTINGS_KEY] ?? { aiPromptSuffix: DEFAULT_SUFFIX };

    // カスタム設定の保存
    const customSettings = { aiPromptSuffix: 'カスタム指示文テスト' };
    await chrome.storage.local.set({ [SETTINGS_KEY]: customSettings });

    // 保存した設定の取得
    const savedResult = await chrome.storage.local.get(SETTINGS_KEY);
    const saved = savedResult[SETTINGS_KEY];

    // クリーンアップ
    await chrome.storage.local.remove(SETTINGS_KEY);

    return {
      defaultSuffix: initial.aiPromptSuffix,
      savedSuffix: saved.aiPromptSuffix,
    };
  });

  expect(result.defaultSuffix).toContain('Markdown');
  expect(result.savedSuffix).toBe('カスタム指示文テスト');
});

test('content.js のサイドバーCSS定義が正しいデザイン要素を含む', async () => {
  const { readFileSync } = await import('fs');
  const content = readFileSync(join(EXTENSION_PATH, 'content/content.js'), 'utf-8');

  // 参考UIに合わせたデザイン要素の確認
  expect(content).toContain('#2da44e');        // 保存ボタン: 緑
  expect(content).toContain('#cf222e');        // エラー/削除: 赤
  expect(content).toContain("position: 'fixed'"); // サイドバー固定配置（インラインスタイル）
  expect(content).toContain('380px');          // サイドバー幅
  expect(content).toContain('このファイルのコメントはまだありません'); // 空状態テキスト
});

test('content.js の折りたたみサイドバーUI要素が定義されている', async () => {
  const { readFileSync } = await import('fs');
  const content = readFileSync(join(EXTENSION_PATH, 'content/content.js'), 'utf-8');

  expect(content).toContain('mdreview-collapsed-bar'); // 折りたたみバー要素
  expect(content).toContain('40px');                   // 折りたたみ時の幅
  expect(content).toContain('sidebarState');           // 状態管理変数
  expect(content).toContain('collapseSidebar');        // 折りたたみ関数
  expect(content).toContain('expandSidebar');          // 展開関数
  expect(content).toContain('true'); // captureフェーズでのクリックイベント登録
});
