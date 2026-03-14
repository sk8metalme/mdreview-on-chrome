import { STORAGE_KEYS, DEFAULTS } from './constants.js';
import { buildRepoKey } from './github-parser.js';

/**
 * リポジトリ単位のストレージキーを生成
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @returns {string}
 */
function makeRepoKey(owner, repo, branch) {
  return `${STORAGE_KEYS.REPO_PREFIX}${owner}/${repo}@${branch}`;
}

/**
 * リポジトリ単位のデータを取得
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @returns {Promise<Object.<string, ReviewComment[]>>}
 */
export async function getRepoData(owner, repo, branch) {
  const key = makeRepoKey(owner, repo, branch);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? {};
}

/**
 * リポジトリ単位のデータを保存
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {Object.<string, ReviewComment[]>} data
 * @returns {Promise<void>}
 */
export async function saveRepoData(owner, repo, branch, data) {
  const key = makeRepoKey(owner, repo, branch);
  await chrome.storage.local.set({ [key]: data });
}

/**
 * ファイル単位のコメントを取得
 * @param {object} fileInfo
 * @returns {Promise<ReviewComment[]>}
 */
export async function getFileComments(fileInfo) {
  const repoData = await getRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch);
  return repoData[fileInfo.path] ?? [];
}

/**
 * コメントを追加
 * @param {object} fileInfo
 * @param {object} comment
 * @returns {Promise<ReviewComment>}
 */
export async function addComment(fileInfo, comment) {
  const repoData = await getRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch);
  const existing = repoData[fileInfo.path] ?? [];
  const newComment = {
    ...comment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  repoData[fileInfo.path] = [...existing, newComment];
  await saveRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch, repoData);
  return newComment;
}

/**
 * コメントを更新
 * @param {object} fileInfo
 * @param {string} id
 * @param {string} commentText
 * @returns {Promise<void>}
 */
export async function updateComment(fileInfo, id, commentText) {
  const repoData = await getRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch);
  const existing = repoData[fileInfo.path] ?? [];
  repoData[fileInfo.path] = existing.map(r =>
    r.id === id
      ? { ...r, comment: commentText, updatedAt: new Date().toISOString() }
      : r
  );
  await saveRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch, repoData);
}

/**
 * コメントを削除
 * @param {object} fileInfo
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteComment(fileInfo, id) {
  const repoData = await getRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch);
  const existing = repoData[fileInfo.path] ?? [];
  const filtered = existing.filter(r => r.id !== id);
  if (filtered.length === 0) {
    delete repoData[fileInfo.path];
  } else {
    repoData[fileInfo.path] = filtered;
  }
  await saveRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch, repoData);
}

/**
 * リポジトリ全体のコメントを取得
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @returns {Promise<Object.<string, ReviewComment[]>>}
 */
export async function getAllRepoComments(owner, repo, branch) {
  return getRepoData(owner, repo, branch);
}

/**
 * リポジトリ全体のコメントを削除
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @returns {Promise<void>}
 */
export async function deleteAllRepoComments(owner, repo, branch) {
  const key = makeRepoKey(owner, repo, branch);
  await chrome.storage.local.remove(key);
}

/**
 * 特定ファイルのコメントを全削除
 * @param {object} fileInfo
 * @returns {Promise<void>}
 */
export async function deleteFileComments(fileInfo) {
  const repoData = await getRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch);
  delete repoData[fileInfo.path];
  await saveRepoData(fileInfo.owner, fileInfo.repo, fileInfo.branch, repoData);
}

/**
 * 設定を取得
 * @returns {Promise<Settings>}
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] ?? { aiPromptSuffix: DEFAULTS.AI_PROMPT_SUFFIX };
}

/**
 * 設定を保存
 * @param {object} settings
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}
