import { DEFAULTS } from './constants.js';

/**
 * レビューコメントから Markdown プロンプトを生成する
 * @param {{ owner: string, repo: string, branch: string, path: string, filename: string }} fileInfo
 * @param {Array} reviews
 * @param {string} [aiPromptSuffix]
 * @returns {string}
 */
export function generateMarkdown(fileInfo, reviews, aiPromptSuffix = DEFAULTS.AI_PROMPT_SUFFIX) {
  const exportDate = new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const lines = [
    `# Markdown Review: ${fileInfo.filename}`,
    '',
    `- **Repository**: ${fileInfo.owner}/${fileInfo.repo}`,
    `- **Branch**: ${fileInfo.branch}`,
    `- **File**: ${fileInfo.path}`,
    `- **Date**: ${exportDate}`,
    `- **Total Comments**: ${reviews.length}`,
    '',
    '---',
    '',
    '## Comments',
    '',
  ];

  reviews.forEach((review, index) => {
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

/**
 * リポジトリ全体のコメントから Markdown プロンプトを生成する
 * @param {{ owner: string, repo: string, branch: string, path: string }} fileInfo
 * @param {Object.<string, Array>} fileCommentsMap
 * @param {string} [aiPromptSuffix]
 * @returns {string}
 */
export function generateRepoMarkdown(fileInfo, fileCommentsMap, aiPromptSuffix = DEFAULTS.AI_PROMPT_SUFFIX) {
  const exportDate = new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const filePaths = Object.keys(fileCommentsMap);
  const totalComments = filePaths.reduce((sum, p) => sum + (fileCommentsMap[p]?.length ?? 0), 0);

  const lines = [
    `# Repository Review: ${fileInfo.owner}/${fileInfo.repo} @ ${fileInfo.branch}`,
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
    if (a === fileInfo.path) return -1;
    if (b === fileInfo.path) return 1;
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
