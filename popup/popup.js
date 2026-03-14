import { MESSAGES, DEFAULTS } from '../lib/constants.js';
import { parseGitHubUrl } from '../lib/github-parser.js';
import { getReviews, addReview, updateReview, deleteReview, getSettings, saveSettings } from '../lib/storage.js';
import { generateMarkdown } from '../lib/markdown-export.js';

let fileInfo = null;
let currentSelection = null;
let reviews = [];
let editingId = null;

// DOM要素
const elFileInfo = document.getElementById('section-file-info');
const elNotMd = document.getElementById('section-not-md');
const elSelection = document.getElementById('section-selection');
const elCommentForm = document.getElementById('section-comment-form');
const elComments = document.getElementById('section-comments');
const elExport = document.getElementById('section-export');
const elSettings = document.getElementById('section-settings');

const elRepo = document.getElementById('file-repo');
const elBranch = document.getElementById('file-branch');
const elFilePath = document.getElementById('file-path');
const elSelectionBadge = document.getElementById('selection-mode-badge');
const elSelectionLabel = document.getElementById('selection-label');
const elSelectionContent = document.getElementById('selection-content');
const elCommentInput = document.getElementById('comment-input');
const elCommentsList = document.getElementById('comments-list');
const elCommentsCount = document.getElementById('comments-count');
const elAiPromptSuffix = document.getElementById('ai-prompt-suffix');

// ボタン
document.getElementById('btn-settings').addEventListener('click', openSettings);
document.getElementById('btn-settings-close').addEventListener('click', closeSettings);
document.getElementById('btn-save').addEventListener('click', saveComment);
document.getElementById('btn-cancel').addEventListener('click', cancelComment);
document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
document.getElementById('btn-download').addEventListener('click', downloadMd);
document.getElementById('btn-settings-save').addEventListener('click', saveSettingsHandler);
document.getElementById('btn-settings-reset').addEventListener('click', resetSettings);

async function init() {
  // 現在アクティブなタブのURLを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showNotMd();
    return;
  }

  fileInfo = parseGitHubUrl(tab.url);
  if (!fileInfo) {
    showNotMd();
    return;
  }

  // ファイル情報表示
  elRepo.textContent = `${fileInfo.owner}/${fileInfo.repo}`;
  elBranch.textContent = fileInfo.branch;
  elFilePath.textContent = fileInfo.path;
  elFileInfo.classList.remove('hidden');

  // レビュー一覧取得
  reviews = await getReviews(fileInfo);
  renderComments();

  // コンテンツスクリプトから最新選択状態を取得
  await fetchLatestSelection();
}

async function fetchLatestSelection() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGES.GET_LATEST_SELECTION });
    if (response?.selection) {
      updateSelectionDisplay(response.selection);
    }
  } catch {
    // コンテンツスクリプト未接続は無視
  }
}

function showNotMd() {
  elNotMd.classList.remove('hidden');
}

function updateSelectionDisplay(selection) {
  currentSelection = selection;

  if (!selection) {
    elSelection.classList.add('hidden');
    elCommentForm.classList.add('hidden');
    return;
  }

  elSelection.classList.remove('hidden');

  if (selection.type === 'code') {
    elSelectionBadge.textContent = 'Code';
    elSelectionBadge.className = 'selection-badge';
    elSelectionLabel.textContent = `L${selection.lineNumber}`;
    elSelectionContent.textContent = selection.lineContent ?? '';
  } else {
    elSelectionBadge.textContent = 'Preview';
    elSelectionBadge.className = 'selection-badge preview-mode';
    elSelectionLabel.textContent = '選択テキスト';
    elSelectionContent.textContent = selection.selectedText ?? '';
  }

  // コメント入力フォームを表示
  elCommentForm.classList.remove('hidden');
  elCommentInput.value = '';
  editingId = null;
}

async function saveComment() {
  const commentText = elCommentInput.value.trim();
  if (!commentText || !fileInfo) return;

  if (editingId) {
    // 編集中のコメントを更新
    await updateReview(fileInfo, editingId, commentText);
    editingId = null;
  } else {
    // 新規コメント
    if (!currentSelection) return;
    const commentData = {
      type: currentSelection.type,
      comment: commentText,
    };
    if (currentSelection.type === 'code') {
      commentData.lineNumber = currentSelection.lineNumber;
      commentData.lineContent = currentSelection.lineContent;
    } else {
      commentData.selectedText = currentSelection.selectedText;
    }
    await addReview(fileInfo, commentData);
  }

  reviews = await getReviews(fileInfo);
  renderComments();
  elCommentForm.classList.add('hidden');
  elCommentInput.value = '';

  // コンテンツスクリプトへ通知
  chrome.runtime.sendMessage({ type: MESSAGES.COMMENTS_UPDATED, fileInfo }).catch(() => {});
}

function cancelComment() {
  elCommentInput.value = '';
  editingId = null;
  elCommentForm.classList.add('hidden');
}

function renderComments() {
  elCommentsCount.textContent = reviews.length;

  if (reviews.length === 0) {
    elComments.classList.add('hidden');
    elExport.classList.add('hidden');
    return;
  }

  elComments.classList.remove('hidden');
  elExport.classList.remove('hidden');

  elCommentsList.innerHTML = '';
  reviews.forEach((review, index) => {
    const li = createCommentItem(review, index + 1);
    elCommentsList.appendChild(li);
  });
}

function createCommentItem(review, index) {
  const li = document.createElement('li');
  li.className = 'comment-item';
  li.dataset.id = review.id;

  const typeLabel = review.type === 'code' ? 'Code' : 'Preview';
  const typeClass = review.type === 'code' ? '' : 'preview';
  const location = review.type === 'code'
    ? `L${review.lineNumber}`
    : '選択テキスト';

  const quoteText = review.type === 'code'
    ? (review.lineContent ?? '')
    : (review.selectedText ?? '');

  li.innerHTML = `
    <div class="comment-item-header">
      <div class="comment-item-meta">
        <span class="comment-type-badge ${typeClass}">${typeLabel}</span>
        <span class="comment-location">#${index} ${location}</span>
      </div>
      <div class="comment-item-actions">
        <button class="btn btn-secondary btn-edit" data-id="${review.id}" style="font-size:11px;padding:3px 8px;">編集</button>
        <button class="btn btn-danger btn-delete" data-id="${review.id}">削除</button>
      </div>
    </div>
    <div class="comment-item-body">
      <div class="comment-quote">${escapeHtml(quoteText)}</div>
      <div class="comment-text">${escapeHtml(review.comment)}</div>
    </div>
  `;

  li.querySelector('.btn-edit').addEventListener('click', () => startEditComment(review));
  li.querySelector('.btn-delete').addEventListener('click', () => confirmDeleteComment(review.id));

  return li;
}

function startEditComment(review) {
  editingId = review.id;
  elCommentInput.value = review.comment;
  elCommentForm.classList.remove('hidden');
  elCommentInput.focus();
}

async function confirmDeleteComment(id) {
  if (!fileInfo) return;
  await deleteReview(fileInfo, id);
  reviews = await getReviews(fileInfo);
  renderComments();
  chrome.runtime.sendMessage({ type: MESSAGES.COMMENTS_UPDATED, fileInfo }).catch(() => {});
}

async function copyToClipboard() {
  if (!fileInfo || reviews.length === 0) return;
  const settings = await getSettings();
  const md = generateMarkdown(fileInfo, reviews, settings.aiPromptSuffix);
  try {
    await navigator.clipboard.writeText(md);
    const btn = document.getElementById('btn-copy');
    const original = btn.textContent;
    btn.textContent = '✅ コピーしました';
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch {
    // clipboard API が使えない場合のフォールバック
  }
}

async function downloadMd() {
  if (!fileInfo || reviews.length === 0) return;
  const settings = await getSettings();
  const md = generateMarkdown(fileInfo, reviews, settings.aiPromptSuffix);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `review-${fileInfo.filename}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function openSettings() {
  const settings = await getSettings();
  elAiPromptSuffix.value = settings.aiPromptSuffix;
  elSettings.classList.remove('hidden');
}

function closeSettings() {
  elSettings.classList.add('hidden');
}

async function saveSettingsHandler() {
  const suffix = elAiPromptSuffix.value.trim() || DEFAULTS.AI_PROMPT_SUFFIX;
  await saveSettings({ aiPromptSuffix: suffix });
  closeSettings();
}

async function resetSettings() {
  elAiPromptSuffix.value = DEFAULTS.AI_PROMPT_SUFFIX;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

init();
