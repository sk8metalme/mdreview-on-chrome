import { GITHUB } from './constants.js';

/**
 * GitHub の .md ファイルURLをパースしてメタ情報を返す
 * @param {string} url
 * @returns {{ owner: string, repo: string, branch: string, path: string, filename: string } | null}
 */
export function parseGitHubUrl(url) {
  const match = url.match(GITHUB.URL_PATTERN);
  if (!match) return null;

  const [, owner, repo, branch, path] = match;
  if (!isMdFile(path)) return null;

  const filename = path.split('/').pop();
  return { owner, repo, branch, path, filename };
}

/**
 * パスが Markdown ファイルかどうか判定
 * @param {string} path
 * @returns {boolean}
 */
export function isMdFile(path) {
  const lower = path.toLowerCase();
  return GITHUB.MD_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/**
 * レビューデータのストレージキーを生成
 * @param {{ owner: string, repo: string, path: string, branch: string }} fileInfo
 * @returns {string}
 */
export function buildStorageKey(fileInfo) {
  const { owner, repo, path, branch } = fileInfo;
  return `${owner}/${repo}/${path}@${branch}`;
}
