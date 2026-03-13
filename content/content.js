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
  URL_PATTERN: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  MD_EXTENSIONS: ['.md', '.markdown', '.mdx'],
};

const SIDEBAR_HOST_ID = 'mdreview-shadow-host';
const REVIEWS_PREFIX = 'reviews:';
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

.mdreview-file-info {
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

.mdreview-error {
  color: #cf222e;
  font-size: 12px;
  padding: 4px 0;
}

.mdreview-comments-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
let currentSelection = null;
let editingId = null;
let highlightedRows = new Set();

// ===== URL解析 =====
function parseUrl() {
  // クエリ文字列（?plain=1 等）を除外してpathを正しく取得
  const url = location.origin + location.pathname;
  const match = url.match(GITHUB.URL_PATTERN);
  if (!match) return null;
  const [, owner, repo, branch, path] = match;
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

function buildStorageKey(fi) {
  return `${REVIEWS_PREFIX}${fi.owner}/${fi.repo}/${fi.path}@${fi.branch}`;
}

// ===== ストレージ操作（インライン） =====
async function loadReviews() {
  if (!fileInfo) return [];
  const key = buildStorageKey(fileInfo);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? [];
}

async function saveReviewsToStorage(data) {
  if (!fileInfo) return;
  const key = buildStorageKey(fileInfo);
  await chrome.storage.local.set({ [key]: data });
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
  await saveReviewsToStorage([...existing, newItem]);
  return newItem;
}

async function updateReviewItem(id, commentText) {
  const existing = await loadReviews();
  const updated = existing.map(r =>
    r.id === id ? { ...r, comment: commentText, updatedAt: new Date().toISOString() } : r
  );
  await saveReviewsToStorage(updated);
}

async function deleteReviewItem(id) {
  const existing = await loadReviews();
  await saveReviewsToStorage(existing.filter(r => r.id !== id));
}

async function loadSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] ?? { aiPromptSuffix: AI_PROMPT_SUFFIX_DEFAULT };
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
        <button class="btn-collapse-toggle btn-collapse-sidebar" title="折りたたむ">▶</button>
      </div>
      <div class="mdreview-file-info"></div>
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
    </div>
    <div class="mdreview-error" style="display:none;"></div>
    <ul class="mdreview-comments-list"></ul>
    <div class="mdreview-empty">このファイルのコメントはまだありません</div>
  `;
  sidebarShadowRoot.appendChild(sidebar);

  attachSidebarEvents();
}

function getSidebar() {
  if (!sidebarShadowRoot) return null;
  return sidebarShadowRoot.querySelector('.mdreview-sidebar');
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
  if (sidebarState === 'expanded') {
    hideSidebar();
  } else {
    expandSidebar();
    renderSidebar();
  }
}

// ===== サイドバー描画 =====
async function renderSidebar() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  // ファイル情報更新
  const fi = fileInfo;
  if (fi) {
    sidebar.querySelector('.mdreview-file-info').textContent =
      `${fi.owner}/${fi.repo} / ${fi.filename} @ ${fi.branch}`;
  }

  // モード情報更新（Code/Preview タブ状態を反映）
  updateModeInfo();

  // 選択状態・コメント一覧更新
  updateSelectionDisplay();
  renderComments();
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

function renderComments() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  const listEl = sidebar.querySelector('.mdreview-comments-list');
  const emptyEl = sidebar.querySelector('.mdreview-empty');
  const exportEl = sidebar.querySelector('.mdreview-export-buttons');

  listEl.innerHTML = '';

  if (reviews.length === 0) {
    emptyEl.style.display = '';
    exportEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  exportEl.style.display = '';

  reviews.forEach((review, index) => {
    const li = document.createElement('li');
    li.className = 'comment-item';
    li.dataset.id = review.id;

    const location = formatReviewLocation(review);

    li.innerHTML = `
      <div class="comment-item-header">
        <span class="comment-location">#${index + 1} ${escapeHtml(location)}</span>
        <div class="comment-actions">
          <button class="btn-sm btn-edit" data-id="${escapeHtml(review.id)}">編集</button>
          <button class="btn-sm btn-del" data-id="${escapeHtml(review.id)}">削除</button>
        </div>
      </div>
      <div class="comment-text">${escapeHtml(review.comment)}</div>
    `;

    li.querySelector('.btn-edit').addEventListener('click', () => startEdit(review));
    li.querySelector('.btn-del').addEventListener('click', () => doDelete(review.id));

    listEl.appendChild(li);
  });
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

      reviews = await loadReviews();
      textarea.value = '';
      currentSelection = null;
      editingId = null;
      updateSelectionDisplay();
      renderComments();
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
    if (!fileInfo || reviews.length === 0) return;
    const settings = await loadSettings();
    const md = generateMarkdown(fileInfo, reviews, settings.aiPromptSuffix);
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
    if (!fileInfo || reviews.length === 0) return;
    const settings = await loadSettings();
    const md = generateMarkdown(fileInfo, reviews, settings.aiPromptSuffix);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-${fileInfo.filename}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
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

async function doDelete(id) {
  try {
    await deleteReviewItem(id);
    reviews = await loadReviews();
    if (editingId === id) {
      editingId = null;
      currentSelection = null;
    }
    updateSelectionDisplay();
    renderComments();
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
  // captureフェーズで登録: GitHubのReactがstopPropagationしても検知できる
  document.addEventListener('click', (e) => {
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
  document.addEventListener('mouseup', () => {
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
  try {
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
  } catch {
    // ストレージアクセスエラーは無視
  }
}

function highlightCodeLine(lineNumber) {
  const container = findLineContainer(lineNumber);
  if (container) {
    container.classList.add(UI.HIGHLIGHT_CLASS);
  }
}

// ===== SPAナビゲーション対応 =====
function observeTabSwitches() {
  // GitHub は Turbo (SPA) を使用
  document.addEventListener('turbo:load', async () => {
    currentSelection = null;
    editingId = null;

    if (!isMdPage()) {
      hideSidebar();
      return;
    }

    fileInfo = parseUrl();
    reviews = await loadReviews();

    if (sidebarState === 'expanded') {
      await renderSidebar();
    } else {
      collapseSidebar();
    }
    restoreHighlights();
  });

  // MutationObserver でDOM変更を検知（タブ切替・ハイライト復元等）
  let lastTab = getCurrentTab();
  const observer = new MutationObserver(() => {
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
  if (message.type === 'toggleSidebar') {
    toggleSidebar();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

// ===== 初期化 =====
async function init() {
  if (!isMdPage()) return;

  fileInfo = parseUrl();
  reviews = await loadReviews();

  createSidebar();
  collapseSidebar(); // ページ遷移時は折りたたみ状態で表示
  restoreHighlights();

  attachCodeLineHandlers();
  attachPreviewSelectionHandlers();
  observeTabSwitches();
}

init();
