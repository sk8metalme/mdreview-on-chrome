// content.js - Chrome拡張のコンテンツスクリプト
// Shadow DOM サイドバーをGitHubのmdファイルページに直接注入

// ===== 定数（ES Modules非対応のためインライン定義） =====
const SELECTORS = {
  LINE_NUMBER: '[data-line-number]',
  MARKDOWN_BODY: 'article.markdown-body',
  CODE_CONTENT: '.blob-code-content',
};

const UI = {
  HIGHLIGHT_CLASS: 'mdreview-highlight',
  SELECTING_CLASS: 'mdreview-selecting',
};

const GITHUB = {
  URL_PATTERN: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i,
  MD_EXTENSIONS: ['.md', '.markdown', '.mdx'],
};

const SIDEBAR_HOST_ID = 'mdreview-shadow-host';
const REPO_PREFIX = 'repo:';
const SETTINGS_KEY = 'settings';
const AI_PROMPT_SUFFIX_DEFAULT = '以上のレビューコメントを踏まえて、このMarkdownファイルを改善してください。';

// Shadow DOM 内サイドバーのCSS
const SIDEBAR_CSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.mdreview-sidebar {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: #24292f;
  border-left: 1px solid #d0d7de;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.mdreview-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: #24292f;
  margin-bottom: 4px;
}

.mdreview-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mdreview-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mdreview-repo-info {
  font-size: 12px;
  color: #57606a;
  word-break: break-all;
  line-height: 1.4;
}

.mdreview-mode-info {
  font-size: 12px;
  color: #57606a;
  padding: 8px 10px;
  background: #f6f8fa;
  border-radius: 6px;
  border: 1px solid #d0d7de;
  line-height: 1.4;
}

.mdreview-selection {
  font-size: 13px;
  color: #24292f;
  font-weight: 500;
  padding: 4px 0;
}

.mdreview-comment-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mdreview-textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  line-height: 1.5;
}

.mdreview-textarea:focus {
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.mdreview-textarea::placeholder {
  color: #6e7781;
}

.mdreview-buttons {
  display: flex;
  gap: 8px;
}

.mdreview-export-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mdreview-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
}

.mdreview-settings-label {
  font-size: 12px;
  font-weight: 600;
  color: #24292f;
}

.mdreview-settings-help {
  font-size: 12px;
  color: #57606a;
  line-height: 1.4;
}

.mdreview-settings-textarea {
  width: 100%;
  min-height: 88px;
  padding: 8px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  line-height: 1.5;
  background: #ffffff;
}

.mdreview-settings-textarea:focus {
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.mdreview-settings-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid;
  font-family: inherit;
  flex: 1;
  text-align: center;
  transition: background 0.1s ease;
}

.btn-save {
  background: #2da44e;
  color: white;
  border-color: rgba(27, 31, 36, 0.15);
}

.btn-save:hover {
  background: #2c974b;
}

.btn-cancel {
  background: white;
  color: #24292f;
  border-color: #d0d7de;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-export,
.btn-download {
  background: white;
  color: #24292f;
  border-color: #d0d7de;
}

.btn-export:hover,
.btn-download:hover {
  background: #f3f4f6;
}

.btn-delete-all {
  background: #cf222e;
  color: white;
  border-color: rgba(27, 31, 36, 0.15);
}

.btn-delete-all:hover {
  background: #a40e26;
}

.btn-settings {
  background: white;
  color: #24292f;
  border-color: #d0d7de;
  flex: 0 0 auto;
}

.btn-settings:hover {
  background: #f3f4f6;
}

.mdreview-error {
  color: #cf222e;
  font-size: 12px;
  padding: 4px 0;
}

.mdreview-comments-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.mdreview-file-group {
  border-bottom: 1px solid #d0d7de;
}

.mdreview-file-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: #f6f8fa;
  user-select: none;
}

.mdreview-file-group-header:hover {
  background: #eaeef2;
}

.mdreview-file-group-header .file-name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.mdreview-file-group-header .badge {
  background: #0969da;
  color: white;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  flex-shrink: 0;
}

.mdreview-file-group-header .current-file-indicator {
  color: #0969da;
  font-size: 11px;
  flex-shrink: 0;
}

.mdreview-file-group-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mdreview-file-group.collapsed .mdreview-file-group-body {
  display: none;
}

.comment-item {
  padding: 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
}

.comment-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comment-location {
  font-size: 12px;
  color: #57606a;
  font-weight: 500;
}

.comment-actions {
  display: flex;
  gap: 4px;
}

.btn-sm {
  padding: 2px 8px;
  font-size: 11px;
  flex: none;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid;
  font-family: inherit;
  background: white;
}

.btn-edit {
  color: #24292f;
  border-color: #d0d7de;
}

.btn-edit:hover {
  background: #f3f4f6;
}

.btn-del {
  color: #cf222e;
  border-color: #d0d7de;
}

.btn-del:hover {
  background: #fff0f0;
}

.comment-text {
  font-size: 13px;
  color: #24292f;
  white-space: pre-wrap;
  line-height: 1.5;
}

.mdreview-empty {
  font-size: 13px;
  color: #57606a;
  text-align: center;
  padding: 16px;
}

.mdreview-collapsed-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 100%;
  display: none;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  gap: 12px;
  background: #ffffff;
  border-left: 1px solid #d0d7de;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.mdreview-collapsed-bar.visible {
  display: flex;
}

.mdreview-collapsed-logo {
  font-size: 11px;
  font-weight: 700;
  color: #0969da;
  writing-mode: vertical-rl;
  letter-spacing: 1px;
  user-select: none;
}

.btn-collapse-toggle {
  background: none;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  cursor: pointer;
  color: #57606a;
  font-size: 12px;
  padding: 4px 6px;
  font-family: inherit;
  line-height: 1;
}

.btn-collapse-toggle:hover {
  background: #f3f4f6;
}

.mdreview-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
`;

// ===== 状態 =====
let sidebarHost = null;
let sidebarShadowRoot = null;
let sidebarState = 'hidden'; // 'hidden' | 'collapsed' | 'expanded'
let fileInfo = null;
let reviews = [];
let allRepoReviews = {};
let currentSelection = null;
let editingId = null;
let highlightedRows = new Set();
let codeLineHandlersAttached = false;
let previewSelectionHandlersAttached = false;
let tabSwitchObserverStarted = false;
let settingsPanelOpen = false;

// ===== URL解析 =====
function parseBlobTitle(title, owner, repo) {
  if (typeof title !== 'string' || title.length === 0) return null;

  const suffix = ` · ${owner}/${repo}`;
  if (!title.endsWith(suffix)) return null;

  const fileAndRef = title.slice(0, -suffix.length);
  const atIndex = fileAndRef.lastIndexOf(' at ');
  if (atIndex === -1) return null;

  const path = fileAndRef.slice(0, atIndex).trim();
  const branch = fileAndRef.slice(atIndex + 4).trim();
  if (!path || !branch) return null;
  if (!GITHUB.MD_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))) return null;

  return { path, branch };
}

function parseUrl() {
  // クエリ文字列（?plain=1 等）を除外してblobパスを取得
  const url = location.origin + location.pathname;
  const match = url.match(GITHUB.URL_PATTERN);
  if (!match) return null;

  const [, owner, repo, blobPath] = match;
  const fromTitle = parseBlobTitle(document.title, owner, repo);
  if (fromTitle) {
    const filename = fromTitle.path.split('/').pop();
    return { owner, repo, branch: fromTitle.branch, path: fromTitle.path, filename };
  }

  const firstSlashIndex = blobPath.indexOf('/');
  if (firstSlashIndex === -1) return null;

  const branch = blobPath.slice(0, firstSlashIndex);
  const path = blobPath.slice(firstSlashIndex + 1);
  if (!GITHUB.MD_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))) return null;
  const filename = path.split('/').pop();
  return { owner, repo, branch, path, filename };
}

function isMdPage() {
  return parseUrl() !== null;
}

// ===== タブ検出 =====
function getCurrentTab() {
  // aria-current="true" のSegmentedControlボタンでアクティブタブを検出
  const activeBtn = document.querySelector('.prc-SegmentedControl-Button-E48xz[aria-current="true"]');
  const tabText = activeBtn?.textContent?.trim();
  if (tabText === 'Preview') return 'preview';
  if (tabText === 'Code' || tabText === 'Blame') return 'code';
  // フォールバック: article.markdown-body の存在でPreviewを判定
  return document.querySelector('article.markdown-body') ? 'preview' : 'code';
}

function updateModeInfo() {
  const sidebar = getSidebar();
  if (!sidebar) return;
  const modeEl = sidebar.querySelector('.mdreview-mode-info');
  if (!modeEl) return;
  const tab = getCurrentTab();
  if (tab === 'preview') {
    modeEl.textContent = 'Previewモード: テキストを選択してコメント対象を指定してください。';
  } else {
    modeEl.textContent = 'Codeモード: 行番号をクリックしてコメント対象を選択してください。';
  }
}

// ===== ストレージ操作（インライン） =====
function buildRepoStorageKey(fi) {
  return `${REPO_PREFIX}${fi.owner}/${fi.repo}@${fi.branch}`;
}

async function loadRepoData() {
  if (!fileInfo) return {};
  const key = buildRepoStorageKey(fileInfo);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? {};
}

async function saveRepoData(data) {
  if (!fileInfo) return;
  const key = buildRepoStorageKey(fileInfo);
  await chrome.storage.local.set({ [key]: data });
}

async function loadReviews() {
  if (!fileInfo) return [];
  const repoData = await loadRepoData();
  return repoData[fileInfo.path] ?? [];
}

async function saveFileReviews(data) {
  if (!fileInfo) return;
  const repoData = await loadRepoData();
  if (data.length === 0) {
    delete repoData[fileInfo.path];
  } else {
    repoData[fileInfo.path] = data;
  }
  await saveRepoData(repoData);
}

async function addReviewItem(comment) {
  const existing = await loadReviews();
  const now = new Date().toISOString();
  const newItem = {
    ...comment,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await saveFileReviews([...existing, newItem]);
  return newItem;
}

async function updateReviewItem(id, commentText) {
  const existing = await loadReviews();
  const updated = existing.map(r =>
    r.id === id ? { ...r, comment: commentText, updatedAt: new Date().toISOString() } : r
  );
  await saveFileReviews(updated);
}

async function deleteReviewItem(id) {
  const existing = await loadReviews();
  await saveFileReviews(existing.filter(r => r.id !== id));
}

async function deleteReviewItemFromPath(id, path) {
  if (!fileInfo) return;
  const repoData = await loadRepoData();
  const comments = repoData[path] ?? [];
  const filtered = comments.filter(r => r.id !== id);
  if (filtered.length === 0) {
    delete repoData[path];
  } else {
    repoData[path] = filtered;
  }
  await saveRepoData(repoData);
}

async function deleteAllRepoReviewsFromStorage() {
  if (!fileInfo) return;
  const key = buildRepoStorageKey(fileInfo);
  await chrome.storage.local.remove(key);
}

async function loadSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] ?? { aiPromptSuffix: AI_PROMPT_SUFFIX_DEFAULT };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

// ===== Markdown生成（インライン） =====
function generateMarkdown(fi, revs, aiPromptSuffix = AI_PROMPT_SUFFIX_DEFAULT) {
  const exportDate = new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const lines = [
    `# Markdown Review: ${fi.filename}`,
    '',
    `- **Repository**: ${fi.owner}/${fi.repo}`,
    `- **Branch**: ${fi.branch}`,
    `- **File**: ${fi.path}`,
    `- **Date**: ${exportDate}`,
    `- **Total Comments**: ${revs.length}`,
    '',
    '---',
    '',
    '## Comments',
    '',
  ];

  revs.forEach((review, index) => {
    const num = index + 1;
    if (review.type === 'code') {
      lines.push(`### Comment ${num} (Code L${review.lineNumber})`);
      if (review.lineContent) {
        lines.push(`> \`${review.lineContent}\``);
        lines.push('');
      }
    } else {
      lines.push(`### Comment ${num} (Preview)`);
      if (review.selectedText) {
        lines.push(`> ${review.selectedText.replace(/\n/g, '\n> ')}`);
        lines.push('');
      }
    }
    lines.push(review.comment);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  lines.push('## Summary');
  lines.push('');
  lines.push(aiPromptSuffix);
  lines.push('');

  return lines.join('\n');
}

function generateRepoMarkdown(fi, fileCommentsMap, aiPromptSuffix = AI_PROMPT_SUFFIX_DEFAULT) {
  const exportDate = new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const filePaths = Object.keys(fileCommentsMap);
  const totalComments = filePaths.reduce((sum, p) => sum + (fileCommentsMap[p]?.length ?? 0), 0);

  const lines = [
    `# Repository Review: ${fi.owner}/${fi.repo} @ ${fi.branch}`,
    '',
    `- **Date**: ${exportDate}`,
    `- **Total Files**: ${filePaths.length}`,
    `- **Total Comments**: ${totalComments}`,
    '',
    '---',
    '',
  ];

  // 現在のファイルを先頭に、他はパス順
  const sortedPaths = [...filePaths].sort((a, b) => {
    if (a === fi.path) return -1;
    if (b === fi.path) return 1;
    return a.localeCompare(b);
  });

  sortedPaths.forEach(path => {
    const comments = fileCommentsMap[path] ?? [];
    lines.push(`## ${path} (${comments.length} comment${comments.length !== 1 ? 's' : ''})`);
    lines.push('');

    comments.forEach((review, index) => {
      const num = index + 1;
      if (review.type === 'code') {
        lines.push(`### Comment ${num} (Code L${review.lineNumber})`);
        if (review.lineContent) {
          lines.push(`> \`${review.lineContent}\``);
          lines.push('');
        }
      } else {
        lines.push(`### Comment ${num} (Preview)`);
        if (review.selectedText) {
          lines.push(`> ${review.selectedText.replace(/\n/g, '\n> ')}`);
          lines.push('');
        }
      }
      lines.push(review.comment);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  });

  lines.push('## Summary');
  lines.push('');
  lines.push(aiPromptSuffix);
  lines.push('');

  return lines.join('\n');
}

// ===== 共通ユーティリティ =====

// 行番号からGitHub DOM上の行コンテナ要素を取得する
// 新GitHub構造(react-line-number)と旧構造(td[data-line-number])の両方に対応
function findLineContainer(lineNumber) {
  const reactLineEl = document.querySelector(
    `.react-line-number[data-line-number="${lineNumber}"]`
  );
  if (reactLineEl) {
    const container = reactLineEl.closest('tr')
      ?? reactLineEl.parentElement?.parentElement
      ?? reactLineEl.parentElement;
    if (container) return container;
  }
  const tdEl = document.querySelector(`td[data-line-number="${lineNumber}"]`);
  return tdEl?.closest('tr') ?? null;
}

// レビューのロケーション文字列を生成する（コメント一覧・編集表示で共用）
function formatReviewLocation(review) {
  if (review.type === 'code') {
    return `Code L${review.lineNumber}`;
  }
  return `Preview「${(review.selectedText || '').slice(0, 15)}…」`;
}

// サイドバー展開中であればコメントフォームを表示する
function showCommentFormIfExpanded() {
  if (!isSidebarExpanded()) return;
  updateSelectionDisplay();
  const sidebar = getSidebar();
  if (sidebar) {
    sidebar.querySelector('.mdreview-comment-form').style.display = '';
  }
}

// ===== HTMLエスケープ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== サイドバーDOM作成 =====
function createSidebar() {
  if (document.getElementById(SIDEBAR_HOST_ID)) return;

  // Shadow Host 作成（位置・サイズはインラインスタイルで指定）
  sidebarHost = document.createElement('div');
  sidebarHost.id = SIDEBAR_HOST_ID;
  Object.assign(sidebarHost.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '380px',
    height: '100vh',
    zIndex: '999999',
    display: 'none',
  });
  document.body.appendChild(sidebarHost);

  // Shadow DOM 作成
  sidebarShadowRoot = sidebarHost.attachShadow({ mode: 'open' });

  // CSS を Shadow DOM に注入
  const style = document.createElement('style');
  style.textContent = SIDEBAR_CSS;
  sidebarShadowRoot.appendChild(style);

  // 折りたたみバー
  const collapsedBar = document.createElement('div');
  collapsedBar.className = 'mdreview-collapsed-bar';
  collapsedBar.innerHTML = `
    <span class="mdreview-collapsed-logo">MR</span>
    <button class="btn-collapse-toggle" title="サイドバーを展開">◀</button>
  `;
  collapsedBar.addEventListener('click', () => {
    expandSidebar();
    renderSidebar();
  });
  sidebarShadowRoot.appendChild(collapsedBar);

  // サイドバー本体
  const sidebar = document.createElement('div');
  sidebar.className = 'mdreview-sidebar';
  sidebar.innerHTML = `
    <div class="mdreview-header">
      <div class="mdreview-header-row">
        <h2>Markdown Review</h2>
        <div class="mdreview-header-actions">
          <button class="btn btn-settings btn-settings-toggle" type="button">設定</button>
          <button class="btn-collapse-toggle btn-collapse-sidebar" title="折りたたむ">▶</button>
        </div>
      </div>
      <div class="mdreview-repo-info"></div>
    </div>
    <div class="mdreview-settings-panel" style="display:none;">
      <div class="mdreview-settings-label">AI 向け指示文（末尾に付加）</div>
      <div class="mdreview-settings-help">Markdown の Summary セクション末尾に追加されます。</div>
      <textarea class="mdreview-settings-textarea" placeholder="AI への指示文を入力してください..."></textarea>
      <div class="mdreview-settings-actions">
        <button class="btn btn-save btn-settings-save" type="button">設定を保存</button>
        <button class="btn btn-cancel btn-settings-reset" type="button">デフォルトに戻す</button>
      </div>
    </div>
    <div class="mdreview-mode-info">Codeモード: 行番号をクリックしてコメント対象を選択してください。</div>
    <div class="mdreview-selection" style="display:none;"></div>
    <div class="mdreview-comment-form" style="display:none;">
      <textarea class="mdreview-textarea" placeholder="コメントを入力してください..."></textarea>
      <div class="mdreview-buttons">
        <button class="btn btn-save">保存</button>
        <button class="btn btn-cancel">削除</button>
      </div>
    </div>
    <div class="mdreview-export-buttons" style="display:none;">
      <button class="btn btn-export">Markdownをコピー</button>
      <button class="btn btn-download">.mdを保存</button>
      <button class="btn btn-delete-all">全コメント削除</button>
    </div>
    <div class="mdreview-error" style="display:none;"></div>
    <div class="mdreview-comments-list"></div>
    <div class="mdreview-empty">このファイルのコメントはまだありません</div>
  `;
  sidebarShadowRoot.appendChild(sidebar);

  attachSidebarEvents();
}

function getSidebar() {
  if (!sidebarShadowRoot) return null;
  return sidebarShadowRoot.querySelector('.mdreview-sidebar');
}

function updateSettingsToggleLabel() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  const toggleBtn = sidebar.querySelector('.btn-settings-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = settingsPanelOpen ? '設定を閉じる' : '設定';
  }
}

function hideSettingsPanel() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  settingsPanelOpen = false;
  const panel = sidebar.querySelector('.mdreview-settings-panel');
  if (panel) {
    panel.style.display = 'none';
  }
  updateSettingsToggleLabel();
}

async function showSettingsPanel() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  const panel = sidebar.querySelector('.mdreview-settings-panel');
  const textarea = sidebar.querySelector('.mdreview-settings-textarea');
  if (!panel || !textarea) return;

  const settings = await loadSettings();
  textarea.value = settings.aiPromptSuffix;
  panel.style.display = 'flex';
  settingsPanelOpen = true;
  updateSettingsToggleLabel();
}

function updateSidebarHostStyle() {
  if (!sidebarHost) return;
  const bar = sidebarShadowRoot?.querySelector('.mdreview-collapsed-bar');
  const sidebar = getSidebar();

  if (sidebarState === 'hidden') {
    sidebarHost.style.display = 'none';
    document.body.classList.remove('mdreview-sidebar-open');
  } else if (sidebarState === 'collapsed') {
    sidebarHost.style.display = 'block';
    sidebarHost.style.width = '40px';
    document.body.classList.remove('mdreview-sidebar-open');
    if (bar) bar.classList.add('visible');
    if (sidebar) sidebar.style.display = 'none';
  } else { // expanded
    sidebarHost.style.display = 'block';
    sidebarHost.style.width = '380px';
    document.body.classList.add('mdreview-sidebar-open');
    if (bar) bar.classList.remove('visible');
    if (sidebar) sidebar.style.display = '';
  }
}

function expandSidebar() {
  if (!sidebarHost) createSidebar();
  sidebarState = 'expanded';
  updateSidebarHostStyle();
}

function collapseSidebar() {
  if (!sidebarHost) createSidebar();
  sidebarState = 'collapsed';
  updateSidebarHostStyle();
}

function hideSidebar() {
  sidebarState = 'hidden';
  updateSidebarHostStyle();
}

function isSidebarExpanded() {
  return sidebarState === 'expanded';
}

function isSidebarVisible() {
  return sidebarState !== 'hidden';
}

function toggleSidebar() {
  if (!isMdPage()) {
    hideSidebar();
    return false;
  }

  if (sidebarState === 'expanded') {
    hideSidebar();
  } else {
    expandSidebar();
    renderSidebar();
  }

  return true;
}

// ===== サイドバー描画 =====
async function renderSidebar() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  // リポジトリ情報更新
  if (fileInfo) {
    sidebar.querySelector('.mdreview-repo-info').textContent =
      `${fileInfo.owner}/${fileInfo.repo} @ ${fileInfo.branch}`;
  }

  updateSettingsToggleLabel();

  // モード情報更新（Code/Preview タブ状態を反映）
  updateModeInfo();

  // 選択状態・コメント一覧更新
  updateSelectionDisplay();
  await renderComments();
}

function updateSelectionDisplay() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  const selEl = sidebar.querySelector('.mdreview-selection');
  const formEl = sidebar.querySelector('.mdreview-comment-form');

  if (!currentSelection && !editingId) {
    selEl.style.display = 'none';
    formEl.style.display = 'none';
    return;
  }

  selEl.style.display = '';
  formEl.style.display = '';

  if (editingId) return; // 編集中は呼び出し元でテキスト設定済み

  if (currentSelection.type === 'code') {
    selEl.textContent = `選択中: Code L${currentSelection.lineNumber}`;
  } else {
    const preview = currentSelection.selectedText.length > 20
      ? currentSelection.selectedText.slice(0, 20) + '…'
      : currentSelection.selectedText;
    selEl.textContent = `選択中: Preview「${preview}」`;
  }

  // 新規コメント入力時はtextareaをリセット
  sidebar.querySelector('.mdreview-textarea').value = '';
}

async function renderComments() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  allRepoReviews = await loadRepoData();
  reviews = allRepoReviews[fileInfo?.path] ?? [];

  const listEl = sidebar.querySelector('.mdreview-comments-list');
  const emptyEl = sidebar.querySelector('.mdreview-empty');
  const exportEl = sidebar.querySelector('.mdreview-export-buttons');

  listEl.innerHTML = '';

  const filePaths = Object.keys(allRepoReviews);
  const totalComments = filePaths.reduce((sum, p) => sum + (allRepoReviews[p]?.length ?? 0), 0);

  if (totalComments === 0) {
    emptyEl.style.display = '';
    exportEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  exportEl.style.display = '';

  // 現在のファイルを先頭に、他はパス順
  const currentPath = fileInfo?.path;
  const sortedPaths = [...filePaths].sort((a, b) => {
    if (a === currentPath) return -1;
    if (b === currentPath) return 1;
    return a.localeCompare(b);
  });

  sortedPaths.forEach(path => {
    const comments = allRepoReviews[path] ?? [];
    const isCurrentFile = (path === currentPath);
    const group = createFileGroup(path, comments, isCurrentFile);
    listEl.appendChild(group);
  });
}

function createFileGroup(path, comments, isCurrentFile) {
  const filename = path.split('/').pop();
  const group = document.createElement('div');
  group.className = 'mdreview-file-group' + (isCurrentFile ? '' : ' collapsed');

  const header = document.createElement('div');
  header.className = 'mdreview-file-group-header';

  const leftDiv = document.createElement('div');
  leftDiv.style.cssText = 'display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;';

  const toggle = document.createElement('span');
  toggle.className = 'file-group-toggle';
  toggle.textContent = isCurrentFile ? '▼' : '▶';

  const fileNameSpan = document.createElement('span');
  fileNameSpan.className = 'file-name';
  fileNameSpan.title = path;
  fileNameSpan.textContent = filename;

  leftDiv.appendChild(toggle);
  leftDiv.appendChild(fileNameSpan);

  if (isCurrentFile) {
    const indicator = document.createElement('span');
    indicator.className = 'current-file-indicator';
    indicator.textContent = '（現在）';
    leftDiv.appendChild(indicator);
  }

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = comments.length;

  header.appendChild(leftDiv);
  header.appendChild(badge);

  header.addEventListener('click', () => {
    group.classList.toggle('collapsed');
    toggle.textContent = group.classList.contains('collapsed') ? '▶' : '▼';
  });

  const body = document.createElement('div');
  body.className = 'mdreview-file-group-body';

  comments.forEach((review, index) => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.dataset.id = review.id;

    const location = review.type === 'code'
      ? `Code L${review.lineNumber}`
      : `Preview「${(review.selectedText || '').slice(0, 15)}…」`;

    const itemHeader = document.createElement('div');
    itemHeader.className = 'comment-item-header';

    const locationSpan = document.createElement('span');
    locationSpan.className = 'comment-location';
    locationSpan.textContent = `#${index + 1} ${location}`;

    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-sm btn-edit';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => {
      if (isCurrentFile) {
        startEdit(review);
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-sm btn-del';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => doDelete(review.id, path));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    itemHeader.appendChild(locationSpan);
    itemHeader.appendChild(actions);

    const commentText = document.createElement('div');
    commentText.className = 'comment-text';
    commentText.textContent = review.comment;

    item.appendChild(itemHeader);
    item.appendChild(commentText);
    body.appendChild(item);
  });

  group.appendChild(header);
  group.appendChild(body);
  return group;
}

// ===== サイドバーイベント =====
function attachSidebarEvents() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  // 折りたたみボタン
  const collapseBtn = sidebar.querySelector('.btn-collapse-sidebar');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      collapseSidebar();
    });
  }

  const settingsToggleBtn = sidebar.querySelector('.btn-settings-toggle');
  if (settingsToggleBtn) {
    settingsToggleBtn.addEventListener('click', async () => {
      clearError();
      if (settingsPanelOpen) {
        hideSettingsPanel();
        return;
      }

      try {
        await showSettingsPanel();
      } catch (e) {
        showError('設定の読み込みに失敗しました: ' + e.message);
      }
    });
  }

  const settingsSaveBtn = sidebar.querySelector('.btn-settings-save');
  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', async () => {
      const textarea = sidebar.querySelector('.mdreview-settings-textarea');
      if (!textarea) return;

      const suffix = textarea.value.trim() || AI_PROMPT_SUFFIX_DEFAULT;
      clearError();

      try {
        await saveSettings({ aiPromptSuffix: suffix });
        textarea.value = suffix;

        const originalText = settingsSaveBtn.textContent;
        settingsSaveBtn.textContent = '保存しました';
        setTimeout(() => {
          settingsSaveBtn.textContent = originalText;
        }, 2000);
      } catch (e) {
        showError('設定の保存に失敗しました: ' + e.message);
      }
    });
  }

  const settingsResetBtn = sidebar.querySelector('.btn-settings-reset');
  if (settingsResetBtn) {
    settingsResetBtn.addEventListener('click', () => {
      const textarea = sidebar.querySelector('.mdreview-settings-textarea');
      if (!textarea) return;

      textarea.value = AI_PROMPT_SUFFIX_DEFAULT;
      clearError();
    });
  }

  // 保存ボタン
  sidebar.querySelector('.btn-save').addEventListener('click', async () => {
    const textarea = sidebar.querySelector('.mdreview-textarea');
    const text = textarea.value.trim();
    if (!text || !fileInfo) return;

    clearError();
    try {
      if (editingId) {
        await updateReviewItem(editingId, text);
        editingId = null;
      } else {
        if (!currentSelection) return;
        const commentData = {
          type: currentSelection.type,
          comment: text,
        };
        if (currentSelection.type === 'code') {
          commentData.lineNumber = currentSelection.lineNumber;
          commentData.lineContent = currentSelection.lineContent;
        } else {
          commentData.selectedText = currentSelection.selectedText;
        }
        await addReviewItem(commentData);
      }

      textarea.value = '';
      currentSelection = null;
      editingId = null;
      updateSelectionDisplay();
      await renderComments();
      restoreHighlights();
    } catch (e) {
      showError('保存に失敗しました: ' + e.message);
    }
  });

  // キャンセル/削除ボタン
  sidebar.querySelector('.btn-cancel').addEventListener('click', () => {
    sidebar.querySelector('.mdreview-textarea').value = '';
    editingId = null;
    currentSelection = null;
    updateSelectionDisplay();
    clearError();
  });

  // Markdownコピーボタン
  sidebar.querySelector('.btn-export').addEventListener('click', async () => {
    if (!fileInfo) return;
    const repoData = await loadRepoData();
    const totalComments = Object.values(repoData).flat().length;
    if (totalComments === 0) return;
    const settings = await loadSettings();
    const md = generateRepoMarkdown(fileInfo, repoData, settings.aiPromptSuffix);
    try {
      await navigator.clipboard.writeText(md);
      const btn = sidebar.querySelector('.btn-export');
      const orig = btn.textContent;
      btn.textContent = '✅ コピーしました';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    } catch {
      showError('クリップボードへのコピーに失敗しました');
    }
  });

  // .md保存ボタン
  sidebar.querySelector('.btn-download').addEventListener('click', async () => {
    if (!fileInfo) return;
    const repoData = await loadRepoData();
    const totalComments = Object.values(repoData).flat().length;
    if (totalComments === 0) return;
    const settings = await loadSettings();
    const md = generateRepoMarkdown(fileInfo, repoData, settings.aiPromptSuffix);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-${fileInfo.repo}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 全コメント削除ボタン
  let deleteAllConfirm = false;
  const deleteAllBtn = sidebar.querySelector('.btn-delete-all');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', async () => {
      if (!deleteAllConfirm) {
        deleteAllConfirm = true;
        deleteAllBtn.textContent = '本当に削除しますか？';
        setTimeout(() => {
          deleteAllConfirm = false;
          deleteAllBtn.textContent = '全コメント削除';
        }, 3000);
      } else {
        deleteAllConfirm = false;
        deleteAllBtn.textContent = '全コメント削除';
        try {
          await deleteAllRepoReviewsFromStorage();
          reviews = [];
          allRepoReviews = {};
          updateSelectionDisplay();
          await renderComments();
          restoreHighlights();
        } catch (e) {
          showError('削除に失敗しました: ' + e.message);
        }
      }
    });
  }
}

function startEdit(review) {
  const sidebar = getSidebar();
  if (!sidebar) return;

  editingId = review.id;
  currentSelection = null;

  const textarea = sidebar.querySelector('.mdreview-textarea');
  textarea.value = review.comment;

  const formEl = sidebar.querySelector('.mdreview-comment-form');
  formEl.style.display = '';

  const selEl = sidebar.querySelector('.mdreview-selection');
  selEl.textContent = `編集中: ${formatReviewLocation(review)}`;
  selEl.style.display = '';

  textarea.focus();
}

async function doDelete(id, path) {
  try {
    if (path && fileInfo && path !== fileInfo.path) {
      await deleteReviewItemFromPath(id, path);
    } else {
      await deleteReviewItem(id);
    }
    if (editingId === id) {
      editingId = null;
      currentSelection = null;
    }
    updateSelectionDisplay();
    await renderComments();
    restoreHighlights();
  } catch (e) {
    showError('削除に失敗しました: ' + e.message);
  }
}

function showError(msg) {
  const sidebar = getSidebar();
  if (!sidebar) return;
  const errEl = sidebar.querySelector('.mdreview-error');
  errEl.textContent = msg;
  errEl.style.display = '';
}

function clearError() {
  const sidebar = getSidebar();
  if (!sidebar) return;
  const errEl = sidebar.querySelector('.mdreview-error');
  errEl.textContent = '';
  errEl.style.display = 'none';
}

// ===== Code タブ: 行番号クリック =====
function attachCodeLineHandlers() {
  if (codeLineHandlersAttached) return;
  codeLineHandlersAttached = true;

  // captureフェーズで登録: GitHubのReactがstopPropagationしても検知できる
  document.addEventListener('click', (e) => {
    if (!isMdPage()) return;

    // 行番号要素を優先的に検出（コードコンテンツ除外）
    const lineNumEl = e.target.closest('.react-line-number[data-line-number]')
      ?? e.target.closest('td[data-line-number]');
    if (!lineNumEl) return;

    const lineNumber = parseInt(lineNumEl.dataset.lineNumber, 10);
    if (isNaN(lineNumber)) return;

    // 行コンテンツ取得: 新GitHub構造(react-file-line)と旧構造(blob-code-content)に対応
    const lineContent = (
      document.querySelector(`.react-file-line[data-line-number="${lineNumber}"]`)
      ?? document.querySelector(`[data-testid="code-cell"][data-line-number="${lineNumber}"]`)
      ?? lineNumEl.closest('tr')?.querySelector(SELECTORS.CODE_CONTENT)
    )?.textContent?.trimEnd() ?? '';

    currentSelection = { type: 'code', lineNumber, lineContent };
    editingId = null;

    updateSelectingHighlight(lineNumber);
    showCommentFormIfExpanded();
  }, true); // capture phase
}

function updateSelectingHighlight(lineNumber) {
  // 既存のselecting ハイライトをクリア
  document.querySelectorAll(`.${UI.SELECTING_CLASS}`).forEach(el => {
    el.classList.remove(UI.SELECTING_CLASS);
  });
  if (!lineNumber) return;

  const container = findLineContainer(lineNumber);
  if (container) {
    container.classList.add(UI.SELECTING_CLASS);
  }
}

// ===== Preview タブ: テキスト選択 =====
function attachPreviewSelectionHandlers() {
  if (previewSelectionHandlersAttached) return;
  previewSelectionHandlersAttached = true;

  document.addEventListener('mouseup', () => {
    if (!isMdPage()) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const markdownBody = document.querySelector(SELECTORS.MARKDOWN_BODY);
    if (!markdownBody) return;

    const range = selection.getRangeAt(0);
    if (!markdownBody.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    currentSelection = { type: 'preview', selectedText };
    editingId = null;
    showCommentFormIfExpanded();
  });
}

// ===== ハイライト復元 =====
function restoreHighlights() {
  document.querySelectorAll(`.${UI.HIGHLIGHT_CLASS}`).forEach(el => {
    el.classList.remove(UI.HIGHLIGHT_CLASS);
  });
  highlightedRows.clear();

  reviews
    .filter(r => r.type === 'code' && r.lineNumber)
    .forEach(r => {
      highlightCodeLine(r.lineNumber);
      highlightedRows.add(r.lineNumber);
    });
}

function highlightCodeLine(lineNumber) {
  const container = findLineContainer(lineNumber);
  if (container) {
    container.classList.add(UI.HIGHLIGHT_CLASS);
  }
}

// ===== SPAナビゲーション対応 =====

// turbo:load と MutationObserver の URL 変更検知で共通利用するナビゲーション処理
async function handleNavigation() {
  currentSelection = null;
  editingId = null;

  if (!isMdPage()) {
    fileInfo = null;
    reviews = [];
    allRepoReviews = {};
    currentSelection = null;
    editingId = null;
    settingsPanelOpen = false;
    hideSidebar();
    return;
  }

  fileInfo = parseUrl();
  allRepoReviews = await loadRepoData();
  reviews = allRepoReviews[fileInfo?.path] ?? [];

  if (sidebarState === 'expanded') {
    await renderSidebar();
  } else {
    collapseSidebar();
  }
  restoreHighlights();
}

function observeTabSwitches() {
  if (tabSwitchObserverStarted) return;
  tabSwitchObserverStarted = true;

  // GitHub は Turbo (SPA) を使用
  document.addEventListener('turbo:load', handleNavigation);

  // MutationObserver でDOM変更を検知（URL変更・タブ切替・ハイライト復元等）
  let lastTab = getCurrentTab();
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    // URL変更を検知 → ファイル情報を再読み込み（ReactベースのSPAナビゲーション対応）
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handleNavigation();
      return;
    }

    if (!isMdPage()) return;

    // タブ切替を検知してモード情報を更新
    const currentTab = getCurrentTab();
    if (currentTab !== lastTab) {
      lastTab = currentTab;
      updateModeInfo();
      // タブ切替時は選択状態をリセット
      currentSelection = null;
      editingId = null;
      updateSelectionDisplay();
    }

    // コード行のハイライトが消えていれば復元
    const hasHighlights = document.querySelector(`.${UI.HIGHLIGHT_CLASS}`);
    if (!hasHighlights && highlightedRows.size > 0) {
      restoreHighlights();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ===== メッセージハンドラ =====
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'toggleSidebar') return false;

  if (!isMdPage()) {
    hideSidebar();
    sendResponse({ ok: false, reason: 'not_markdown' });
    return false;
  }

  handleNavigation()
    .then(() => {
      toggleSidebar();
      sendResponse({ ok: true });
    })
    .catch((error) => {
      console.error('[mdreview] toggleSidebar failed:', error);
      sendResponse({ ok: false, reason: 'error', message: error.message });
    });

  return true;
});

// ===== 初期化 =====
async function init() {
  attachCodeLineHandlers();
  attachPreviewSelectionHandlers();
  observeTabSwitches();

  await handleNavigation();
}

init();
