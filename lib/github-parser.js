import { GITHUB } from './constants.js';

function parseBlobTitle(title, owner, repo) {
  if (typeof title !== 'string' || title.length === 0) return null;

  const suffix = ` · ${owner}/${repo}`;
  if (!title.endsWith(suffix)) return null;

  const fileAndRef = title.slice(0, -suffix.length);
  const atIndex = fileAndRef.lastIndexOf(' at ');
  if (atIndex === -1) return null;

  const path = fileAndRef.slice(0, atIndex).trim();
  const branch = fileAndRef.slice(atIndex + 4).trim();
  if (!path || !branch || !isMdFile(path)) return null;

  return { path, branch };
}

/**
 * GitHub の .md ファイルURLをパースしてメタ情報を返す
 * @param {string} url
 * @param {string} [title]
 * @returns {{ owner: string, repo: string, branch: string, path: string, filename: string } | null}
 */
export function parseGitHubUrl(url, title = '') {
  if (typeof url !== 'string' || url.length === 0) return null;
  const normalizedUrl = url.split('#')[0].split('?')[0];
  const match = normalizedUrl.match(GITHUB.URL_PATTERN);
  if (!match) return null;

  const [, owner, repo, blobPath] = match;
  const fromTitle = parseBlobTitle(title, owner, repo);
  if (fromTitle) {
    const filename = fromTitle.path.split('/').pop();
    return { owner, repo, branch: fromTitle.branch, path: fromTitle.path, filename };
  }

  const firstSlashIndex = blobPath.indexOf('/');
  if (firstSlashIndex === -1) return null;

  const branch = blobPath.slice(0, firstSlashIndex);
  const path = blobPath.slice(firstSlashIndex + 1);
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
 * レビューデータのストレージキーを生成（ファイル単位、後方互換）
 * @param {{ owner: string, repo: string, path: string, branch: string }} fileInfo
 * @returns {string}
 */
export function buildStorageKey(fileInfo) {
  const { owner, repo, path, branch } = fileInfo;
  return `${owner}/${repo}/${path}@${branch}`;
}

/**
 * リポジトリ単位のストレージキーを生成
 * @param {{ owner: string, repo: string, branch: string }} fileInfo
 * @returns {string}
 */
export function buildRepoKey(fileInfo) {
  const { owner, repo, branch } = fileInfo;
  return `${owner}/${repo}@${branch}`;
}
