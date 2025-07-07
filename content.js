/**
 * @file YouTube Absolute Date Display Extension
 * @version 2.3 (Debuggable)
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
    return CONFIG.VIDEO_ID_PATTERNS.map(p => url.match(p)).find(m => m)?.[1] || null;
  }
  static formatDate(dateString) {
    const d = new Date(dateString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  static debugLog(debug, ...args) {
    if (debug) console.log('[YTDate]', ...args);
  }
}

class YouTubeAPI {
  constructor() {
    this.apiKey = null;
    // this.cache = new Map(); // キャッシュ機能を削除
    this.initializeAPIKey();
  }

  async initializeAPIKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['youtubeApiKey'], (result) => {
        if (result.youtubeApiKey) {
          this.apiKey = result.youtubeApiKey;
        } else {
          this.promptForAPIKey();
        }
        resolve();
      });
    });
  }

  promptForAPIKey() {
    const message = [
      'YouTube Data API v3 キーを入力してください。',
      'Google Cloud Console (https://console.cloud.google.com/) でAPIキーを取得できます。',
      '',
      'APIキーを入力:'
    ].join('\n');
    const apiKey = prompt(message);
    if (apiKey?.trim()) {
      this.apiKey = apiKey.trim();
      chrome.storage.sync.set({ youtubeApiKey: this.apiKey });
    }
  }

  async fetchVideoDetails(videoId) {
    if (!this.apiKey) return null;
    // if (this.cache.has(videoId)) return this.cache.get(videoId); // キャッシュの確認処理を削除

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[YTDate] API request failed:', response.status);
        return null;
      }
      const data = await response.json();
      const item = data.items?.[0];
      if (item) {
        const result = { publishedAt: item.snippet.publishedAt, title: item.snippet.title };
        // this.cache.set(videoId, result); // キャッシュへの保存処理を削除
        return result;
      }
    } catch (error) {
      console.error('[YTDate] Error fetching video details:', error);
    }
    return null;
  }

  static resetAPIKey() {
    chrome.storage.sync.remove('youtubeApiKey', () => {
      alert('APIキーがリセットされました。ページを再読み込みして新しいキーを入力してください。');
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
    containers.forEach(container => this.intersectionObserver.observe(container));
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
    this.mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: false });
  }
  isRelevantElement(element) {
    return element.matches?.(CONFIG.SELECTORS.CONTAINERS.join(', ')) ||
           element.querySelector?.(CONFIG.SELECTORS.VIDEO_TITLE) ||
           element.matches?.(CONFIG.SELECTORS.VIDEO_TITLE);
  }
  getVideoIdFromElement(element) {
    const videoElement = element.closest(CONFIG.SELECTORS.VIDEO_ELEMENTS.join(', '));
    const link = videoElement?.querySelector(CONFIG.SELECTORS.VIDEO_LINK);
    return link?.href ? Utils.extractVideoId(link.href) : null;
  }
  processNewElements(container, callback) {
    const titleElements = container.querySelectorAll(CONFIG.SELECTORS.VIDEO_TITLE);
    titleElements.forEach(element => {
      if (!this.processedElements.has(element)) {
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
  }
  onMouseEnter() {
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
  getVideoContainer() { return this.element.closest(CONFIG.SELECTORS.VIDEO_ELEMENTS.join(', ')); }
  getRelativeDateSpan(container) {
    const spans = container.querySelectorAll(CONFIG.SELECTORS.METADATA_LINE);
    Utils.debugLog(this.debug, '[ホバー調査] getRelativeDateSpan: メタデータ候補:', Array.from(spans).map(item => item.textContent));
    const metadataItems = Array.from(spans).filter(span => span.textContent.trim() && span.textContent.trim() !== '•');
    return metadataItems.length > 0 ? metadataItems[metadataItems.length - 1] : null;
  }
  createOverlay(container, dateSpan) {
    this.overlay = document.createElement('span');
    this.overlay.className = 'absolute-date-overlay';
    this.applyOverlayStyles(container);
    dateSpan.insertAdjacentElement('afterend', this.overlay);
  }
  applyOverlayStyles(container) {
    const baseStyles = { fontFamily: '"Roboto", "Arial", sans-serif', fontSize: '1.4rem', fontWeight: '400', color: 'var(--yt-spec-text-secondary)' };
    const layoutStyles = container.tagName.toLowerCase() === 'ytd-compact-video-renderer' ? { display: 'block', marginLeft: '0' } : { display: 'inline', marginLeft: '4px' };
    Object.assign(this.overlay.style, { ...baseStyles, ...layoutStyles });
  }
  startAnimation() {
    this.overlay.textContent = ' !';
    CONFIG.ANIMATION_STEPS.forEach((delay, index) => {
      const timer = setTimeout(() => {
        if (this.overlay) this.overlay.textContent = ' ' + '!'.repeat(index + 2);
      }, delay);
      this.animationTimers.push(timer);
    });
  }
  scheduleAPICall() {
    this.apiCallTimer = setTimeout(async () => {
      await this.executeAPICall();
    }, CONFIG.TIMING.HOVER_DELAY_MS);
  }
  async executeAPICall() {
    const videoId = DOMManager.prototype.getVideoIdFromElement.call(this, this.element);
    if (!videoId) {
      this.overlay?.remove();
      return;
    }
    if (this.overlay) this.overlay.textContent = ' (読み込み中...)';
    const videoDetails = await this.api.fetchVideoDetails(videoId);
    this.updateOverlayWithResult(videoDetails);
  }
  updateOverlayWithResult(videoDetails) {
    if (!this.overlay) return;
    if (videoDetails) {
      const formattedDate = Utils.formatDate(videoDetails.publishedAt);
      const container = this.getVideoContainer();
      const isCompact = container.tagName.toLowerCase() === 'ytd-compact-video-renderer';
      this.overlay.textContent = isCompact ? `(${formattedDate})` : `• ${formattedDate}`;
      this.overlay.title = `実際のアップロード日: ${formattedDate}`;
      this.overlay.classList.add('is-permanent');
    } else {
      this.overlay.remove();
    }
  }
  clearTimers() {
    clearTimeout(this.apiCallTimer);
    this.animationTimers.forEach(clearTimeout);
    this.animationTimers = [];
  }
}

class YouTubeDateDisplay {
  constructor() {
    // ================================================================
    // ★★★ デバッグモードのON/OFFは、この行で行います ★★★
    // ================================================================
    this.debug = false; // 詳細なログを見たい場合は true に変更してください
    // ================================================================

    Utils.debugLog(this.debug, '[調査ログ 1/11] constructor: 実行開始');
    this.api = new YouTubeAPI();
    this.domManager = new DOMManager();
    this.debounceTimer = null;
    this.retryCount = 0;
    this.init();
    Utils.debugLog(this.debug, '[調査ログ 2/11] constructor: 実行完了');
  }
  async init() {
    Utils.debugLog(this.debug, '[調査ログ 3/11] init: 実行開始');
    await this.api.initializeAPIKey();
    this.setupObservers();
    this.setupScrollListener();
    this.setupInitialHoverListeners();
    Utils.debugLog(this.debug, '[調査ログ 4/11] init: 実行完了');
  }
  setupObservers() {
    Utils.debugLog(this.debug, '[調査ログ 5/11] setupObservers: 実行開始');
    this.domManager.setupIntersectionObserver(container => this.processNewElements(container));
    this.domManager.setupMutationObserver(() => this.debounceSetupHoverListeners());
    Utils.debugLog(this.debug, '[調査ログ 6/11] setupObservers: 実行完了');
  }
  setupScrollListener() {
    Utils.debugLog(this.debug, '[調査ログ 7/11] setupScrollListener: 実行中');
    const throttledScrollHandler = Utils.throttle(() => this.processAllElements(), CONFIG.TIMING.SCROLL_THROTTLE_MS);
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
  }
  setupInitialHoverListeners() {
    Utils.debugLog(this.debug, '[調査ログ 8/11] setupInitialHoverListeners: 実行中');
    this.setupHoverListeners();
  }
  processAllElements() {
    const containers = document.querySelectorAll(CONFIG.SELECTORS.CONTAINERS.join(', '));
    containers.forEach(container => this.processNewElements(container));
  }
  processNewElements(container) {
    this.domManager.processNewElements(container, element => this.addHoverListeners(element));
  }
  setupHoverListeners() {
    Utils.debugLog(this.debug, '[調査ログ 9/11] setupHoverListeners: 実行開始');
    const containers = document.querySelectorAll(CONFIG.SELECTORS.CONTAINERS.join(', '));
    if (containers.length === 0) {
      Utils.debugLog(this.debug, '[調査ログ] No containers found, retrying...');
      this.retrySetup();
      return;
    }
    Utils.debugLog(this.debug, `[調査ログ] Found ${containers.length} containers`);
    containers.forEach(container => this.processContainer(container));
    this.domManager.observeContainers();
    Utils.debugLog(this.debug, '[調査ログ 10/11] setupHoverListeners: 実行完了');
  }
  retrySetup() {
    if (this.retryCount < CONFIG.RETRY_ATTEMPTS) {
      this.retryCount++;
      setTimeout(() => this.setupHoverListeners(), CONFIG.TIMING.RETRY_DELAY_MS * this.retryCount);
    }
  }
  processContainer(container) {
    const titleElements = container.querySelectorAll(CONFIG.SELECTORS.VIDEO_TITLE);
    Utils.debugLog(this.debug, `Processing container with ${titleElements.length} title elements`);
    titleElements.forEach(element => {
      if (this.domManager.processedElements.has(element)) return;
      this.domManager.processedElements.add(element);
      this.addHoverListeners(element);
    });
  }
  addHoverListeners(element) {
    const handler = new HoverHandler(element, this.api, this.debug);
    element.addEventListener('mouseenter', handler.onMouseEnter.bind(handler));
    element.addEventListener('mouseleave', handler.onMouseLeave.bind(handler));
  }
  debounceSetupHoverListeners() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.setupHoverListeners(), CONFIG.TIMING.DEBOUNCE_DELAY_MS);
  }
  toggleDebug(enable) {
    Utils.debugLog(true, '[調査ログ 11/11] toggleDebug: 実行中');
    this.debug = !!enable;
    const status = this.debug ? '有効' : '無効';
    const message = `デバッグモードが ${status} になりました。`;
    Utils.debugLog(true, message);
    return message;
  }
  cleanup() {
    this.domManager.cleanup();
    clearTimeout(this.debounceTimer);
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

class ExtensionManager {
  static instance = null;
  static urlObserver = null;
  static initialize() {
    if (this.instance) this.instance.cleanup();
    this.instance = new YouTubeDateDisplay();
    if (!this.urlObserver) this.urlObserver = new URLObserver();
  }
  static reinitialize() { this.initialize(); }
  static resetAPIKey() { return YouTubeAPI.resetAPIKey(); }
  static toggleDebug(enable) {
    if (this.instance) return this.instance.toggleDebug(enable);
    return "デバッグモードの切り替えに失敗しました。インスタンスが見つかりません。";
  }
  static cleanup() {
    this.instance?.cleanup();
    this.urlObserver?.cleanup();
    this.instance = null;
    this.urlObserver = null;
  }
}

function initializeExtension() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ExtensionManager.initialize.bind(ExtensionManager));
  } else {
    ExtensionManager.initialize();
  }
}

window.resetYouTubeAPIKey = ExtensionManager.resetAPIKey;
window.ytDateDebug = ExtensionManager.toggleDebug.bind(ExtensionManager);
initializeExtension();

//* Copyright 2025 tumin-dosu. All rights reserved.