// セレクタ定数 - GitHub DOM構造が変わった場合はここを更新するだけ
export const SELECTORS = {
  LINE_NUMBER: '[data-line-number]',
  MARKDOWN_BODY: 'article.markdown-body',
  CODE_CONTENT: '.blob-code-content',
  CODE_TABLE: '.js-file-line-container',
  TAB_PREVIEW: '[data-tab-item="preview"]',
  TAB_CODE: '[data-tab-item="blob-content-tab-rich-diff"]',
  ACTIVE_TAB: '.react-blob-header-edit-and-raw-actions',
};

// ストレージキー
export const STORAGE_KEYS = {
  REVIEWS_PREFIX: 'reviews:',
  REPO_PREFIX: 'repo:',
  SETTINGS: 'settings',
};

// デフォルト値
export const DEFAULTS = {
  AI_PROMPT_SUFFIX: '以上のレビューコメントを踏まえて、このMarkdownファイルを改善してください。',
};

// UI定数
export const UI = {
  POPUP_WIDTH: 400,
  POPUP_MIN_HEIGHT: 500,
  HIGHLIGHT_COLOR: 'rgba(255, 213, 79, 0.3)',
  SELECTING_COLOR: 'rgba(66, 165, 245, 0.3)',
  HIGHLIGHT_CLASS: 'mdreview-highlight',
  SELECTING_CLASS: 'mdreview-selecting',
  CONTAINER_ID: 'mdreview-container',
};

// サイドバー定数
export const SIDEBAR = {
  WIDTH: '380px',
  ID: 'mdreview-sidebar',
  SHADOW_HOST_ID: 'mdreview-shadow-host',
};

// GitHub URL・ファイル判定
export const GITHUB = {
  URL_PATTERN: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  MD_EXTENSIONS: ['.md', '.markdown', '.mdx'],
};

// メッセージ種別
export const MESSAGES = {
  SELECTION_CHANGED: 'selectionChanged',
  GET_SELECTION: 'getSelection',
  COMMENTS_UPDATED: 'commentsUpdated',
  GET_LATEST_SELECTION: 'getLatestSelection',
};
