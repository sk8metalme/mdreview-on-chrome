// service-worker.js
// 拡張アイコンクリック時にコンテンツスクリプトへトグルメッセージを送信

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' }).catch((error) => {
    const message = String(error?.message ?? '');
    if (!message.includes('Receiving end does not exist')) {
      console.error('[mdreview] toggleSidebar message failed:', error);
    }
  });
});
