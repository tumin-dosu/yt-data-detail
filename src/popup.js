/*
 popup.js Copyright (C) 2025 tumin-dosu

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation; version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @file YouTube  Detail
 * @version 2.5 (Security Enhanced)
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