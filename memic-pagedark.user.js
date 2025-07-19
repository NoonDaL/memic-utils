// ==UserScript==
// @name         Memic 게시판 개선 스크립트(다크 모드)
// @namespace    http://memic.at/
// @version      0.3.4
// @description  페이지네이션, 시간 표시, 카테고리 색깔 구분 통합 (1열 표시, 읽은 게시글 표시 개선)
// @match        *://memic.at/*
// @match        *://shelter.id/*
// @grant        none
// @author       NoonDaL
// ==/UserScript==

(function () {
  'use strict';
  const SHELTER_ID = 162131, ARTICLES_PER_PAGE = 100, MAX_PAGES = 10;
  let container = null, currentPage = 0, articleList = [], scrollPosition = 0;

  const categoryColors = {
    '공지': '#FF5C5C', '자유': '#4FC3F7', '후방주의': '#FF8A80', '소식': '#9575CD',
    '창작': '#FFB74D', '질문': '#4DB6AC', '공략': '#81C784', '애니': '#BA68C8',
    '스포/유출': '#F06292', '굿즈/후기': '#A1887F', '대리가챠': '#90A4AE',
    '컨텐츠 추천': '#7986CB', '클립': '#64B5F6', '이벤트': '#FFD54F'
  };

  // CSS Style Add-On - Improved Posting Style Read
  function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Targeting post containers only */
      .app-shelter-board-paging-star-inserted {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Display only post items in column 1 */
      .app-shelter-board-paging-star-inserted .app-article-list-item,
      .app-shelter-board-paging-star-inserted [data-userscript-generated="true"] {
        width: 100% !important;
        max-width: 100% !important;
        display: block !important;
        float: none !important;
        clear: both !important;
        margin: 0 0 6px 0 !important;
        box-sizing: border-box !important;
      }

      /* Improve the style of posts read */
      .article-read {
        background: #2e2e2e !important;
        border-color: #404040 !important;
        opacity: 0.75 !important;
      }

      .article-read .article-title {
        color: #999 !important;
        font-weight: normal !important;
      }

      .article-read .article-meta {
        color: #777 !important;
      }

      .article-read .category-tag {
        opacity: 0.8 !important;
      }

      /* Emphasis on a clear post */
      .article-unread {
        background: #1a1a1a !important;
        border-color: #2a4a5a !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
      }

      .article-unread .article-title {
        color: #f0f0e0 !important;
        font-weight: 500 !important;
      }

      /* Improve Timing Style */
      .article-time {
        font-size: 15px !important;
        font-weight: 500 !important;
        color: #ccc !important;
      }

      .article-read .article-time {
        color: #888 !important;
      }

      /* Page Bar Style */
      .userscript-pagination {
        display: block !important;
        width: 100% !important;
        clear: both !important;
        text-align: center !important;
        margin: 1em 0 !important;
      }

      /* Page Bar Button Style */
      .userscript-pagination button {
        margin: 0 4px !important;
        padding: 4px 8px !important;
        border: 1px solid #555 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        display: inline-block !important;
        background: #2a2a2a !important;
        color: #e0e0e0 !important;
      }

      .userscript-pagination button:hover {
        background: #3a3a3a !important;
      }

      .userscript-pagination button.active {
        background: #4FC3F7 !important;
        color: #fff !important;
        font-weight: bold !important;
        border-color: #4FC3F7 !important;
      }
    `;
    document.head.appendChild(style);
  }

  async function fetchArticles(offsetId = null) {
    const url = new URL(`https://rest.memic.at/v2/shelters/${SHELTER_ID}/articles`);
    url.searchParams.set("isNotice", "false");
    url.searchParams.set("size", ARTICLES_PER_PAGE);
    if (offsetId) url.searchParams.set("offsetId", offsetId);
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json.list || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  function formatDate(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0') + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0') + ':' +
           String(d.getSeconds()).padStart(2, '0');
  }

  function renderArticles(container, articles) {
    articleList = articles;
    container.innerHTML = '';

    // Add a class to a container
    container.classList.add('app-shelter-board-paging-star-inserted');

    articles.forEach(article => {
      const boardName = article.board?.name;
      const headerText = boardName || 'NoHeader';
      const headerColor = categoryColors[headerText] || '#90A4AE';
      const created = article.createDate ? formatDate(new Date(article.createDate)) : 'N/A';

      const div = document.createElement('div');
      div.setAttribute('data-userscript-generated', 'true');
      div.className = 'app-article-list-item border-b-on-background-variant2';

      // Check if read a post
      const viewed = localStorage.getItem('viewed-' + article.id);
      const isRead = !!viewed;

      // Default Style Settings
      div.style.cssText = `
        padding: 12px !important;
        margin-bottom: 6px !important;
        cursor: pointer !important;
        border-radius: 6px !important;
        transition: all 0.2s ease !important;
        border: none !important;
        position: relative !important;
      `;

      // Distinguish between read and non-read posts
      if (isRead) {
        div.classList.add('article-read');
      } else {
        div.classList.add('article-unread');
      }

      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span class="category-tag" style="background:${headerColor};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:12px;line-height:1.3;">
            ${headerText}
          </span>
          <span class="article-title" style="font-size:14px; flex:1;">${article.title || 'Untitled'}</span>
        </div>
        <div class="article-meta" style="display: flex; justify-content: space-between; font-size:11px;">
          <div>
            작성자: <span style="font-weight:500;color:#ddd">${article.owner?.name || 'Unknown'}</span> ·
            조회수 ${article.viewCount || 0} · 좋아요 ${article.likeCount || 0} ·
            답글 ${article.replyCount || article.commentCount || 0}
          </div>
          <div class="article-time">${created}</div>
        </div>`;

      div.addEventListener('click', () => {
        // Mark as read
        localStorage.setItem('viewed-' + article.id, Date.now().toString());

        // Update Style Immediately
        div.classList.remove('article-unread');
        div.classList.add('article-read');

        scrollPosition = window.scrollY;
        sessionStorage.setItem('lastPage', currentPage);
        sessionStorage.setItem('lastScroll', scrollPosition);
        window.location.href = `https://memic.at/articles/${article.id}`;
      });

      // Improved hover effect
      div.addEventListener('mouseenter', () => {
        if (isRead) {
          div.style.backgroundColor = '#3a3a3a !important';
          div.style.opacity = '0.85 !important';
          div.style.transform = 'translateY(-1px)';
        } else {
          div.style.backgroundColor = '#2a2a2a !important';
          div.style.transform = 'translateY(-2px)';
          div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5) !important';
        }
      });

      div.addEventListener('mouseleave', () => {
        div.style.transform = 'translateY(0)';
        if (isRead) {
          div.style.backgroundColor = '#2e2e2e !important';
          div.style.opacity = '0.75 !important';
          div.style.boxShadow = 'none !important';
        } else {
          div.style.backgroundColor = '#1a1a1a !important';
          div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4) !important';
        }
      });

      container.appendChild(div);
    });
  }

  async function loadPagesSequentially(idx) {
    let last = null, res = [];
    for (let i = 0; i <= idx; i++) {
      const page = await fetchArticles(last);
      if (!page?.length) break;
      res = page;
      last = page.at(-1).id;
    }
    return res;
  }

  function clearPaginationBars() {
    document.querySelectorAll('.userscript-pagination').forEach(bar => bar.remove());
  }

  function clearArticles(c) {
    c.querySelectorAll('.app-article-list-item, div[data-userscript-generated]').forEach(el => el.remove());
  }

  function createPaginationBar() {
    const bar = document.createElement('div');
    bar.setAttribute('data-userscript-generated', 'true');
    bar.classList.add('userscript-pagination');

    for (let i = 0; i < MAX_PAGES; i++) {
      const btn = document.createElement('button');
      btn.textContent = i + 1;
      btn.dataset.page = i;
      if (i === currentPage) {
        btn.classList.add('active');
      }
      bar.appendChild(btn);
    }

    bar.addEventListener('click', async e => {
      if (e.target.tagName === 'BUTTON') {
        const idx = parseInt(e.target.dataset.page);
        if (!isNaN(idx)) {
          currentPage = idx;
          const items = await loadPagesSequentially(idx);
          clearArticles(container);
          renderArticles(container, items);
          syncPaginationBars();
        }
      }
    });
    return bar;
  }

  function syncPaginationBars() {
    document.querySelectorAll('.userscript-pagination').forEach(bar => {
      bar.querySelectorAll('button').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === currentPage);
      });
    });
  }

  function preventScroll() {
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.addedNodes.length && container) {
          // Remove only the original post elements (except those created by the user script)
          container.querySelectorAll('.app-article-list-item:not([data-userscript-generated])').forEach(el => el.remove());
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function observeAndInit() {
    console.log('스크립트 시작됨');

    // Finding a Post Container
    function findContainer() {
      // Finding a Post Container with a More Specific Selector
      const selectors = [
        'app-article-list-item',
        '[class*="article-list"]',
        '[class*="board-content"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.parentElement;
        }
      }
      return null;
    }

    new MutationObserver((muts, obs) => {
      const c = findContainer();
      if (c) {
        console.log('컨테이너 발견:', c);
        obs.disconnect();
        container = c;
        runMain();
      }
    }).observe(document.body, { childList: true, subtree: true });

    // Check it out immediately
    const immediateContainer = findContainer();
    if (immediateContainer) {
      console.log('즉시 컨테이너 발견:', immediateContainer);
      container = immediateContainer;
      runMain();
    }
  }

  async function runMain() {
    // Add CSS Style
    addCustomStyles();

    const list = await loadPagesSequentially(currentPage);
    clearArticles(container);
    renderArticles(container, list);

    clearPaginationBars();
    const top = createPaginationBar();
    const bottom = createPaginationBar();

    // Add PageNation Bar in a safer way
    if (container.parentElement) {
      container.parentElement.insertBefore(top, container);
      container.parentElement.appendChild(bottom);
    }

    preventScroll();

    // Restoring scrolls
    const savedScroll = sessionStorage.getItem('lastScroll');
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
      }, 100);
    }
  }

  // Backward Processing
  window.addEventListener('popstate', async (event) => {
    if (!container) return;

    const savedPage = sessionStorage.getItem('lastPage');
    const savedScroll = sessionStorage.getItem('lastScroll');

    if (savedPage) {
      currentPage = parseInt(savedPage);
      const list = await loadPagesSequentially(currentPage);
      clearArticles(container);
      renderArticles(container, list);

      clearPaginationBars();
      const top = createPaginationBar();
      const bottom = createPaginationBar();

      if (container.parentElement) {
        container.parentElement.insertBefore(top, container);
        container.parentElement.appendChild(bottom);
      }

      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScroll));
        }, 100);
      }
    }
  });

  // Read Status Management Functions
  function clearReadHistory() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('viewed-')) {
        localStorage.removeItem(key);
      }
    });
    location.reload();
  }

  function markAllAsRead() {
    articleList.forEach(article => {
      localStorage.setItem('viewed-' + article.id, Date.now().toString());
    });
    location.reload();
  }

  // Adding keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Ctrl + R: Initialize read status
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      if (confirm('모든 읽음 상태를 초기화하시겠습니까?')) {
        clearReadHistory();
      }
    }

    // Ctrl + M: Mark all posts as read
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      if (confirm('현재 페이지의 모든 게시글을 읽음으로 표시하시겠습니까?')) {
        markAllAsRead();
      }
    }
  });

  // Processing page restoration
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      runMain();
    }
  });

  // Initialization
  observeAndInit();
})();
