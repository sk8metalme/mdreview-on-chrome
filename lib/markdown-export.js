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
