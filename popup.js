document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status');
  const openOptionsBtn = document.getElementById('openOptions');
  
  // 設定状態を確認
  const result = await chrome.storage.sync.get(['youtubeApiKey']);
  
  if (result.youtubeApiKey) {
    status.innerHTML = '<div class="status success">✅ 設定完了</div>';
  } else {
    status.innerHTML = '<div class="status error">❌ APIキーが未設定</div>';
  }
  
  // 設定ページを開く
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});