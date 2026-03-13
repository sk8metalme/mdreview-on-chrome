import { STORAGE_KEYS, DEFAULTS } from './constants.js';
import { buildStorageKey } from './github-parser.js';

/**
 * レビューコメントを全件取得
 * @param {object} fileInfo
 * @returns {Promise<ReviewComment[]>}
 */
export async function getReviews(fileInfo) {
  const key = STORAGE_KEYS.REVIEWS_PREFIX + buildStorageKey(fileInfo);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? [];
}

/**
 * レビューコメントを保存（追加）
 * @param {object} fileInfo
 * @param {object} comment
 * @returns {Promise<void>}
 */
export async function addReview(fileInfo, comment) {
  const key = STORAGE_KEYS.REVIEWS_PREFIX + buildStorageKey(fileInfo);
  const existing = await getReviews(fileInfo);
  const newComment = {
    ...comment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [key]: [...existing, newComment] });
  return newComment;
}

/**
 * レビューコメントを更新
 * @param {object} fileInfo
 * @param {string} id
 * @param {string} commentText
 * @returns {Promise<void>}
 */
export async function updateReview(fileInfo, id, commentText) {
  const key = STORAGE_KEYS.REVIEWS_PREFIX + buildStorageKey(fileInfo);
  const existing = await getReviews(fileInfo);
  const updated = existing.map(r =>
    r.id === id
      ? { ...r, comment: commentText, updatedAt: new Date().toISOString() }
      : r
  );
  await chrome.storage.local.set({ [key]: updated });
}

/**
 * レビューコメントを削除
 * @param {object} fileInfo
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteReview(fileInfo, id) {
  const key = STORAGE_KEYS.REVIEWS_PREFIX + buildStorageKey(fileInfo);
  const existing = await getReviews(fileInfo);
  const filtered = existing.filter(r => r.id !== id);
  await chrome.storage.local.set({ [key]: filtered });
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
