// service-worker.js
// 拡張アイコンクリック時にコンテンツスクリプトへトグルメッセージを送信

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' }).catch(() => {
    // コンテンツスクリプトが未注入（非.mdページ等）の場合は無視
  });
});
