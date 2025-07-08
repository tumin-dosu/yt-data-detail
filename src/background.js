/* background.js
Copyright (C) 2025 tumin-dosu

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation; version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
/*
/**
 * @file YouTube Absolute Date Display Extension
 * @version 2.6 (Security Enhanced)
 * @author tumin-dosu
 * @date 2025-07-07
 * @description YouTube動画の相対日付表示の横に投稿年月日を追加するChrome拡張機能
 * @contact : tumin_sfre@outlook.com
 * Copyright 2025 tumin-dosu. All rights reserved.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});