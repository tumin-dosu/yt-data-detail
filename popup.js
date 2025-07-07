/**
 * @file YouTube Absolute Date Display Extension
 * @version 2.4 (Security Enhanced)
 * @author tumin-dosu
 * @date 2025-07-07
 * @description YouTube動画の相対日付表示の横に投稿年月日を追加するChrome拡張機能
 * @contact : tumin_sfre@outlook.com
 * Copyright 2025 tumin-dosu. All rights reserved.
 */

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