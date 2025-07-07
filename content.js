/**
 * @file YouTube Absolute Date Display Extension
 * @version 2.4 (Security Enhanced)
 * @author tumin-dosu
 * @date 2025-07-07
 * @description YouTube動画の相対日付表示の横に投稿年月日を追加するChrome拡張機能
 * @contact : tumin_sfre@outlook.com
 * Copyright 2025 tumin-dosu. All rights reserved.
 */

const CONFIG = {
  SELECTORS: {
    CONTAINERS: [
      'ytd-rich-grid-renderer',
      'ytd-watch-next-secondary-results-renderer',
      'ytd-item-section-renderer'
    ],
    VIDEO_ELEMENTS: [
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'yt-lockup-view-model-wiz',
      'yt-lockup-view-model-wiz--vertical',
      'yt-lockup-view-model-wiz--compact',
      'yt-lockup-metadata-view-model'
    ],
    VIDEO_TITLE: '#video-title, .yt-lockup-metadata-view-model-wiz__title',
    VIDEO_LINK: 'a[href*="watch?v="]',
    METADATA_LINE: '#metadata-line span, .yt-content-metadata-view-model-wiz__metadata-row span',
    DATE_OVERLAY: '.absolute-date-overlay'
  },
  TIMING: {
    HOVER_DELAY_MS: 1200,
    DEBOUNCE_DELAY_MS: 300,
    URL_CHANGE_DELAY_MS: 1000,
    SCROLL_THROTTLE_MS: 100,
    RETRY_DELAY_MS: 500
  },
  ANIMATION_STEPS: [400, 800, 1200],
  RETRY_ATTEMPTS: 3,
  VIDEO_ID_PATTERNS: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
};

class Utils {
  static throttle(func, delay) {
    let timeoutId; let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  static extractVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    return CONFIG.VIDEO_ID_PATTERNS.map(p => url.match(p)).find(m => m)?.[1] || null;
  }

  static formatDate(dateString) {
    if (!dateString) return null;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('[YTDate] Date formatting error:', error);
      return null;
    }
  }

  static debugLog(isDebug, ...args) {
    if (isDebug) {
      console.log('[YTDate Debug]', ...args);
    }
  }

  static sanitizeVideoId(videoId) {
    if (!videoId || typeof videoId !== 'string') return null;
    // YouTube動画IDの形式をチェック（11文字の英数字、ハイフン、アンダースコア）
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  }
}

class YouTubeAPI {
  constructor() {
    this.apiKey = null;
    this.isDebugMode = false;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 100; // 100ms間隔でリクエスト制限
    this.initializeSettings();
  }

  async initializeSettings() {
    try {
      const result = await chrome.storage.sync.get(['youtubeApiKey', 'debugMode']);
      this.apiKey = result.youtubeApiKey || null;
      this.isDebugMode = result.debugMode || false;
      
      Utils.debugLog(this.isDebugMode, 'API初期化完了', { 
        hasApiKey: !!this.apiKey, 
        debugMode: this.isDebugMode 
      });
      
      if (!this.apiKey) {
        this.showAPIKeyRequiredMessage();
      }
    } catch (error) {
      console.error('[YTDate] Settings initialization error:', error);
    }
  }

  showAPIKeyRequiredMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff5722;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      max-width: 300px;
    `;
    messageDiv.innerHTML = `
      <strong>YouTube Date Display</strong><br>
      APIキーが設定されていません。<br>
      <small>クリックして設定ページを開く</small>
    `;
    
    messageDiv.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptions' });
      messageDiv.remove();
    });
    
    document.body.appendChild(messageDiv);
    
    // 10秒後に自動で削除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 10000);
  }

  async fetchVideoDetails(videoId) {
    if (!this.apiKey) {
      Utils.debugLog(this.isDebugMode, 'APIキーが設定されていません');
      return null;
    }

    const sanitizedVideoId = Utils.sanitizeVideoId(videoId);
    if (!sanitizedVideoId) {
      Utils.debugLog(this.isDebugMode, '無効な動画ID:', videoId);
      return null;
    }

    try {
      // レート制限の実装
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
      }
      
      this.lastRequestTime = Date.now();
      this.requestCount++;
      
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(sanitizedVideoId)}&part=snippet&key=${encodeURIComponent(this.apiKey)}`;
      
      Utils.debugLog(this.isDebugMode, `API呼び出し開始 (${this.requestCount}回目):`, sanitizedVideoId);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          console.warn('[YTDate] API quota exceeded or invalid key');
          this.showQuotaExceededMessage();
          return null;
        } else if (response.status === 429) {
          console.warn('[YTDate] Rate limit exceeded');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const item = data.items?.[0];
      
      if (item) {
        const result = { 
          publishedAt: item.snippet.publishedAt, 
          title: item.snippet.title 
        };
        
        Utils.debugLog(this.isDebugMode, 'API呼び出し成功:', {
          videoId: sanitizedVideoId,
          publishedAt: result.publishedAt,
          title: result.title?.substring(0, 50) + '...'
        });
        
        return result;
      } else {
        Utils.debugLog(this.isDebugMode, 'API応答に動画データがありません:', sanitizedVideoId);
        return null;
      }
    } catch (error) {
      console.error('[YTDate] Error fetching video details:', error);
      Utils.debugLog(this.isDebugMode, 'API呼び出しエラー:', error);
      return null;
    }
  }

  showQuotaExceededMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
    `;
    messageDiv.innerHTML = `
      <strong>YouTube Date Display</strong><br>
      APIの使用制限に達しました。<br>
      <small>明日まで待つか、Google Cloud Consoleで制限を増やしてください。</small>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 8000);
  }

  // 外部からAPIキーをリセットする際に使用
  static resetAPIKey() {
    chrome.storage.sync.remove(['youtubeApiKey'], () => {
      console.log('[YTDate] APIキーがリセットされました');
    });
  }
}

class DOMManager {
  constructor() {
    this.processedElements = new Set();
    this.intersectionObserver = null;
    this.mutationObserver = null;
  }

  setupIntersectionObserver(callback) {
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) callback(entry.target);
      });
    }, { rootMargin: '50px', threshold: 0.1 });
    this.observeContainers();
  }

  observeContainers() {
    const containers = document.querySelectorAll(CONFIG.SELECTORS.CONTAINERS.join(', '));
    containers.forEach(container => {
      if (container) {
        this.intersectionObserver.observe(container);
      }
    });
  }

  setupMutationObserver(callback) {
    if (this.mutationObserver) this.mutationObserver.disconnect();
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && this.isRelevantElement(node)) {
              shouldUpdate = true;
            }
          });
        }
      });
      if (shouldUpdate) callback();
    });
    this.mutationObserver.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: false 
    });
  }

  isRelevantElement(element) {
    return element.matches?.(CONFIG.SELECTORS.CONTAINERS.join(', ')) ||
           element.querySelector?.(CONFIG.SELECTORS.VIDEO_TITLE) ||
           element.matches?.(CONFIG.SELECTORS.VIDEO_TITLE);
  }

  getVideoIdFromElement(element) {
    if (!element) return null;
    
    const videoElement = element.closest(CONFIG.SELECTORS.VIDEO_ELEMENTS.join(', '));
    if (!videoElement) return null;
    
    const link = videoElement.querySelector(CONFIG.SELECTORS.VIDEO_LINK);
    if (!link || !link.href) return null;
    
    return Utils.extractVideoId(link.href);
  }

  processNewElements(container, callback) {
    if (!container) return;
    
    const titleElements = container.querySelectorAll(CONFIG.SELECTORS.VIDEO_TITLE);
    titleElements.forEach(element => {
      if (element && !this.processedElements.has(element)) {
        this.processedElements.add(element);
        callback(element);
      }
    });
  }

  cleanup() {
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.processedElements.clear();
  }
}

class HoverHandler {
  constructor(element, api, debug = false) {
    this.element = element;
    this.api = api;
    this.debug = debug;
    this.apiCallTimer = null;
    this.animationTimers = [];
    this.overlay = null;
    this.isDestroyed = false;
  }

  onMouseEnter() {
    if (this.isDestroyed) return;
    
    Utils.debugLog(this.debug, '[ホバー調査 1/4] onMouseEnter: 実行開始');
    
    const container = this.getVideoContainer();
    if (!container) {
      Utils.debugLog(this.debug, '[ホバー調査] エラー: コンテナが見つからないため終了');
      return;
    }
    
    if (container.querySelector(CONFIG.SELECTORS.DATE_OVERLAY)) {
      Utils.debugLog(this.debug, '[ホバー調査] 既に処理済みのため終了');
      return;
    }
    
    Utils.debugLog(this.debug, '[ホバー調査 2/4] 動画コンテナを発見:', container);
    
    const dateSpan = this.getRelativeDateSpan(container);
    if (!dateSpan) {
      Utils.debugLog(this.debug, '[ホバー調査] エラー: 相対日付のspan要素が見つかりませんでした。');
      return;
    }
    
    Utils.debugLog(this.debug, '[ホバー調査 3/4] 相対日付のspan要素を発見:', dateSpan);
    
    this.createOverlay(container, dateSpan);
    this.startAnimation();
    this.scheduleAPICall();
    
    Utils.debugLog(this.debug, '[ホバー調査 4/4] API呼び出しをスケジュールしました');
  }

  onMouseLeave() {
    this.clearTimers();
    if (this.overlay && !this.overlay.classList.contains('is-permanent')) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  getVideoContainer() { 
    return this.element?.closest(CONFIG.SELECTORS.VIDEO_ELEMENTS.join(', ')); 
  }

  getRelativeDateSpan(container) {
    if (!container) return null;
    
    const spans = container.querySelectorAll(CONFIG.SELECTORS.METADATA_LINE);
    Utils.debugLog(this.debug, '[ホバー調査] getRelativeDateSpan: メタデータ候補:', 
      Array.from(spans).map(item => item.textContent?.trim()));
    
    const metadataItems = Array.from(spans).filter(span => 
      span.textContent && span.textContent.trim() && span.textContent.trim() !== '•'
    );
    
    return metadataItems.length > 0 ? metadataItems[metadataItems.length - 1] : null;
  }

  createOverlay(container, dateSpan) {
    if (!container || !dateSpan) return;
    
    this.overlay = document.createElement('span');
    this.overlay.className = 'absolute-date-overlay';
    this.applyOverlayStyles(container);
    
    try {
      dateSpan.insertAdjacentElement('afterend', this.overlay);
    } catch (error) {
      console.error('[YTDate] Error creating overlay:', error);
      this.overlay = null;
    }
  }

  applyOverlayStyles(container) {
    if (!this.overlay || !container) return;
    
    const baseStyles = { 
      fontFamily: '"Roboto", "Arial", sans-serif', 
      fontSize: '1.4rem', 
      fontWeight: '400', 
      color: 'var(--yt-spec-text-secondary)',
      opacity: '1'
    };
    
    const isCompact = container.tagName.toLowerCase() === 'ytd-compact-video-renderer';
    const layoutStyles = isCompact ? 
      { display: 'block', marginLeft: '0' } : 
      { display: 'inline', marginLeft: '4px' };
    
    Object.assign(this.overlay.style, { ...baseStyles, ...layoutStyles });
  }

  startAnimation() {
    if (!this.overlay || this.isDestroyed) return;
    
    this.overlay.textContent = ' !';
    
    CONFIG.ANIMATION_STEPS.forEach((delay, index) => {
      const timer = setTimeout(() => {
        if (this.overlay && !this.isDestroyed) {
          this.overlay.textContent = ' ' + '!'.repeat(index + 2);
        }
      }, delay);
      this.animationTimers.push(timer);
    });
  }

  scheduleAPICall() {
    if (this.isDestroyed) return;
    
    this.apiCallTimer = setTimeout(async () => {
      if (!this.isDestroyed) {
        await this.executeAPICall();
      }
    }, CONFIG.TIMING.HOVER_DELAY_MS);
  }

  async executeAPICall() {
    if (this.isDestroyed || !this.overlay) return;
    
    const videoId = DOMManager.prototype.getVideoIdFromElement.call(this, this.element);
    if (!videoId) {
      this.overlay?.remove();
      return;
    }
    
    if (this.overlay) {
      this.overlay.textContent = ' (読み込み中...)';
    }
    
    try {
      const videoDetails = await this.api.fetchVideoDetails(videoId);
      if (!this.isDestroyed) {
        this.updateOverlayWithResult(videoDetails);
      }
    } catch (error) {
      console.error('[YTDate] API call error:', error);
      if (this.overlay && !this.isDestroyed) {
        this.overlay.remove();
      }
    }
  }

  updateOverlayWithResult(videoDetails) {
    if (!this.overlay || this.isDestroyed) return;
    
    if (videoDetails && videoDetails.publishedAt) {
      const formattedDate = Utils.formatDate(videoDetails.publishedAt);
      if (formattedDate) {
        const container = this.getVideoContainer();
        const isCompact = container?.tagName.toLowerCase() === 'ytd-compact-video-renderer';
        
        this.overlay.textContent = isCompact ? `(${formattedDate})` : `• ${formattedDate}`;
        this.overlay.title = `実際のアップロード日: ${formattedDate}`;
        this.overlay.classList.add('is-permanent');
      } else {
        this.overlay.remove();
      }
    } else {
      this.overlay.remove();
    }
  }

  clearTimers() {
    if (this.apiCallTimer) {
      clearTimeout(this.apiCallTimer);
      this.apiCallTimer = null;
    }
    
    this.animationTimers.forEach(timer => clearTimeout(timer));
    this.animationTimers = [];
  }

  destroy() {
    this.isDestroyed = true;
    this.clearTimers();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

class URLObserver {
  constructor() {
    this.currentUrl = location.href;
    this.observer = null;
    this.setupObserver();
  }

  setupObserver() {
    this.observer = new MutationObserver(() => {
      if (location.href !== this.currentUrl) {
        this.currentUrl = location.href;
        setTimeout(() => ExtensionManager.reinitialize(), CONFIG.TIMING.URL_CHANGE_DELAY_MS);
      }
    });
    
    this.observer.observe(document, { subtree: true, childList: true });
  }

  cleanup() {
    this.observer?.disconnect();
  }
}

class YouTubeDateDisplay {
  constructor() {
    this.api = new YouTubeAPI();
    this.domManager = new DOMManager();
    this.hoverHandlers = new Map();
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      await this.api.initializeSettings();
      
      if (!this.api.apiKey) {
        console.warn('[YTDate] APIキーが設定されていません');
        return;
      }
      
      this.setupEventListeners();
      this.processExistingElements();
      this.isInitialized = true;
      
      console.log('[YTDate] Extension initialized successfully');
    } catch (error) {
      console.error('[YTDate] Initialization error:', error);
    }
  }

  setupEventListeners() {
    this.domManager.setupIntersectionObserver((container) => {
      this.domManager.processNewElements(container, (element) => {
        this.attachHoverHandler(element);
      });
    });
    
    this.domManager.setupMutationObserver(() => {
      this.processExistingElements();
    });
  }

  processExistingElements() {
    const containers = document.querySelectorAll(CONFIG.SELECTORS.CONTAINERS.join(', '));
    containers.forEach(container => {
      this.domManager.processNewElements(container, (element) => {
        this.attachHoverHandler(element);
      });
    });
  }

  attachHoverHandler(element) {
    if (!element || this.hoverHandlers.has(element)) return;
    
    const handler = new HoverHandler(element, this.api, this.api.isDebugMode);
    this.hoverHandlers.set(element, handler);
    
    element.addEventListener('mouseenter', () => handler.onMouseEnter());
    element.addEventListener('mouseleave', () => handler.onMouseLeave());
  }

  cleanup() {
    this.hoverHandlers.forEach(handler => handler.destroy());
    this.hoverHandlers.clear();
    this.domManager.cleanup();
    this.isInitialized = false;
  }
}

class ExtensionManager {
  static instance = null;
  static urlObserver = null;

  static initialize() {
    if (this.instance) {
      this.instance.cleanup();
    }
    
    this.instance = new YouTubeDateDisplay();
    
    if (!this.urlObserver) {
      this.urlObserver = new URLObserver();
    }
  }

  static reinitialize() { 
    this.initialize(); 
  }

  static resetAPIKey() { 
    return YouTubeAPI.resetAPIKey(); 
  }

  static cleanup() {
    this.instance?.cleanup();
    this.urlObserver?.cleanup();
    this.instance = null;
    this.urlObserver = null;
  }
}

// メッセージリスナーの追加
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptions') {
      chrome.runtime.openOptionsPage();
    }
  });
}

// 拡張機能の初期化
function initializeExtension() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ExtensionManager.initialize.bind(ExtensionManager));
  } else {
    ExtensionManager.initialize();
  }
}

// ページがYouTubeかどうかを確認
if (window.location.hostname === 'www.youtube.com') {
  initializeExtension();
}

// ページのアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
  ExtensionManager.cleanup();
});

/* Copyright 2025 tumin-dosu. All rights reserved. */