import { test, expect, chromium } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', '..');

// Phase 1 検証ポイント:
// - 拡張がChromeに正常にロードされる
// - manifest.json がサイドバー構成（default_popup なし）を持つ
// - lib/github-parser.js が .md URL を正しくパースする
// - 非.mdファイルでは機能無効（URLパーサーレベル）

let context;
let extensionId;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Service Worker が起動するまで少し待機
  await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => {});

  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    extensionId = workers[0].url().split('/')[2];
  }
});

test.afterAll(async () => {
  await context.close();
});

test('拡張機能が正常にロードされる', async () => {
  const workers = context.serviceWorkers();
  const extWorkers = workers.filter(w => w.url().includes('chrome-extension://'));
  expect(extWorkers.length).toBeGreaterThan(0);
});

test('manifest.json がサイドバー構成（default_popup なし）を持つ', async () => {
  const { readFileSync } = await import('fs');
  const manifest = JSON.parse(readFileSync(join(EXTENSION_PATH, 'manifest.json'), 'utf-8'));

  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toContain('storage');
  expect(manifest.permissions).toContain('activeTab');
  expect(manifest.permissions).toContain('clipboardWrite');
  // サイドバー方式: default_popup は不要
  expect(manifest.action?.default_popup).toBeUndefined();
  expect(manifest.background?.service_worker).toBe('background/service-worker.js');
  expect(manifest.content_scripts?.[0]?.js).toContain('content/content.js');
});

test('lib/github-parser.js が .md URL を正しくパースする', async () => {
  const { parseGitHubUrl, isMdFile } = await import('../../lib/github-parser.js');

  // .md URL のパース
  const mdResult = parseGitHubUrl('https://github.com/owner/repo/blob/main/docs/README.md');
  expect(mdResult).not.toBeNull();
  expect(mdResult?.owner).toBe('owner');
  expect(mdResult?.repo).toBe('repo');
  expect(mdResult?.branch).toBe('main');
  expect(mdResult?.path).toBe('docs/README.md');
  expect(mdResult?.filename).toBe('README.md');

  // 非 .md URL
  const nonMdResult = parseGitHubUrl('https://github.com/owner/repo/blob/main/src/index.js');
  expect(nonMdResult).toBeNull();

  // .markdown 拡張子
  const markdownResult = parseGitHubUrl('https://github.com/a/b/blob/dev/NOTES.markdown');
  expect(markdownResult).not.toBeNull();

  // .mdx 拡張子
  const mdxResult = parseGitHubUrl('https://github.com/a/b/blob/dev/page.mdx');
  expect(mdxResult).not.toBeNull();

  // スラッシュを含むブランチ名
  const slashBranchResult = parseGitHubUrl(
    'https://github.com/owner/repo/blob/feature/sidebar/README.md',
    'README.md at feature/sidebar · owner/repo',
  );
  expect(slashBranchResult).not.toBeNull();
  expect(slashBranchResult?.branch).toBe('feature/sidebar');
  expect(slashBranchResult?.path).toBe('README.md');

  // query / hash を含む URL
  const decoratedUrlResult = parseGitHubUrl(
    'https://github.com/owner/repo/blob/main/docs/README.md?plain=1#L10',
    'docs/README.md at main · owner/repo',
  );
  expect(decoratedUrlResult).not.toBeNull();
  expect(decoratedUrlResult?.branch).toBe('main');
  expect(decoratedUrlResult?.path).toBe('docs/README.md');

  // isMdFile
  expect(isMdFile('docs/README.md')).toBe(true);
  expect(isMdFile('src/index.js')).toBe(false);
});

test('非.mdファイルでは機能無効メッセージが表示される（URLパーサーレベル）', async () => {
  const { parseGitHubUrl } = await import('../../lib/github-parser.js');

  const testUrls = [
    'https://github.com/owner/repo',
    'https://github.com/owner/repo/blob/main/src/app.js',
    'https://github.com/owner/repo/blob/main/package.json',
    'https://google.com',
  ];

  for (const url of testUrls) {
    expect(parseGitHubUrl(url)).toBeNull();
  }
});

test('lib/constants.js にSIDEBAR定数が定義されている', async () => {
  const { SIDEBAR } = await import('../../lib/constants.js');

  expect(SIDEBAR).toBeDefined();
  expect(SIDEBAR.WIDTH).toBe('380px');
  expect(SIDEBAR.ID).toBe('mdreview-sidebar');
  expect(SIDEBAR.SHADOW_HOST_ID).toBe('mdreview-shadow-host');
});
