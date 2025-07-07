/**
 * YouTube Date Display Extension - Options Page
 * @version 2.4
 * @author tumin-dosu
 */

class OptionsManager {
  constructor() {
    this.apiKey = '';
    this.isDebugMode = false;
    this.initializeElements();
    this.loadSettings();
    this.bindEvents();
  }

  initializeElements() {
    this.elements = {
      apiKey: document.getElementById('apiKey'),
      toggleVisibility: document.getElementById('toggleVisibility'),
      saveBtn: document.getElementById('save'),
      resetBtn: document.getElementById('reset'),
      status: document.getElementById('status'),
      enableDebug: document.getElementById('enableDebug'),
      usageInfo: document.getElementById('usage-info')
    };
  }

  bindEvents() {
    this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
    this.elements.resetBtn.addEventListener('click', () => this.resetSettings());
    this.elements.toggleVisibility.addEventListener('click', () => this.togglePasswordVisibility());
    this.elements.enableDebug.addEventListener('change', () => this.toggleDebugMode());
    this.elements.apiKey.addEventListener('input', () => this.clearStatus());
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['youtubeApiKey', 'debugMode']);
      
      if (result.youtubeApiKey) {
        this.apiKey = result.youtubeApiKey;
        this.elements.apiKey.value = this.apiKey;
        this.showStatus('APIキーが設定されています', 'success');
        this.updateUsageInfo();
      }
      
      if (result.debugMode) {
        this.isDebugMode = result.debugMode;
        this.elements.enableDebug.checked = this.isDebugMode;
      }
    } catch (error) {
      this.showStatus('設定の読み込みに失敗しました', 'error');
      console.error('Settings load error:', error);
    }
  }

  async saveSettings() {
    const apiKey = this.elements.apiKey.value.trim();
    
    if (!apiKey) {
      this.showStatus('APIキーを入力してください', 'error');
      return;
    }

    if (!this.validateAPIKey(apiKey)) {
      this.showStatus('APIキーの形式が正しくありません', 'error');
      return;
    }

    try {
      this.showStatus('保存中...', 'info');
      
      await chrome.storage.sync.set({
        youtubeApiKey: apiKey,
        debugMode: this.elements.enableDebug.checked
      });
      
      this.apiKey = apiKey;
      this.isDebugMode = this.elements.enableDebug.checked;
      
      this.showStatus('設定を保存しました', 'success');
      this.updateUsageInfo();
      
    } catch (error) {
      this.showStatus('保存に失敗しました', 'error');
      console.error('Save error:', error);
    }
  }



  async resetSettings() {
    if (!confirm('すべての設定をリセットしますか？この操作は取り消せません。')) {
      return;
    }

    try {
      await chrome.storage.sync.clear();
      
      this.elements.apiKey.value = '';
      this.elements.enableDebug.checked = false;
      this.apiKey = '';
      this.isDebugMode = false;
      
      this.showStatus('設定をリセットしました', 'success');
      this.updateUsageInfo();
      
    } catch (error) {
      this.showStatus('リセットに失敗しました', 'error');
      console.error('Reset error:', error);
    }
  }

  togglePasswordVisibility() {
    const input = this.elements.apiKey;
    const button = this.elements.toggleVisibility;
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '=';
    } else {
      input.type = 'password';
      button.textContent = '-';
    }
  }

  toggleDebugMode() {
    this.isDebugMode = this.elements.enableDebug.checked;
  }

  validateAPIKey(apiKey) {
    // 基本的なAPIキー形式チェック
    return apiKey.length >= 20 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  showStatus(message, type) {
    const status = this.elements.status;
    status.textContent = message;
    status.className = `status ${type}`;
    
    // 一定時間後に自動的にクリア（成功メッセージのみ）
    if (type === 'success') {
      setTimeout(() => this.clearStatus(), 3000);
    }
  }

  clearStatus() {
    this.elements.status.textContent = '';
    this.elements.status.className = 'status';
  }

  updateUsageInfo() {
    const info = this.elements.usageInfo;
    
    if (this.apiKey) {
      info.innerHTML = `
        <p><strong>APIキー:</strong> 設定済み (${this.apiKey.slice(0, 8)}...)</p>
        <p><strong>デバッグモード:</strong> ${this.isDebugMode ? '有効' : '無効'}</p>
        <p><strong>使用制限:</strong> 1日あたり10,000リクエスト</p>
        <p><small>※ 制限に達した場合は翌日まで待つか、Google Cloud Consoleで制限を増やしてください</small></p>
      `;
    } else {
      info.innerHTML = '<p>APIキーが設定されていません</p>';
    }
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});