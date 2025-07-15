// ==UserScript==
// @name         Shelter 게시판 개선 스크립트
// @namespace    http://memic.at/
// @version      0.2
// @description  페이지네이션, 시간 표시, 카테고리 색깔 구분 통합
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
    articleList = articles; // Store the current list
    container.innerHTML = ''; // Clear and re-render
    articles.forEach(article => {
      const boardName = article.board?.name;
      const headerText = boardName || 'NoHeader';
      const headerColor = categoryColors[headerText] || '#90A4AE';
      const created = article.createDate ? formatDate(new Date(article.createDate)) : 'N/A';

      const div = document.createElement('div');
      div.setAttribute('data-userscript-generated', 'true');
      div.className = 'app-article-list-item border-b-on-background-variant2';
      div.style.padding = '12px';
      div.style.marginBottom = '6px';
      div.style.cursor = 'pointer';

      const viewed = localStorage.getItem('viewed-' + article.id);
      if (viewed) {
        div.style.backgroundColor = '#2e2e2e';
      }

      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="background:${headerColor};color:#fff;padding:1px 5px;border-radius:3px;font-weight:bold;font-size:13px;line-height:1.3;">
            ${headerText}
          </span>
          <span style="color:#f0f0e0; font-size:14px;">${article.title || 'Untitled'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size:11px; color:#aaa; margin-top:4px;">
          <div>
            작성자: <span style="color:#ccc">${article.owner?.name || 'Unknown'}</span> ·
            조회수 ${article.viewCount || 0} · 좋아요 ${article.likeCount || 0} ·
            답글 ${article.replyCount || article.commentCount || 0}
          </div>
          <div style="color:#888;">${created}</div>
        </div>`;

      div.addEventListener('click', () => {
        localStorage.setItem('viewed-' + article.id, '1');
        scrollPosition = window.scrollY; // Save current scroll position
        sessionStorage.setItem('lastPage', currentPage);
        sessionStorage.setItem('lastScroll', scrollPosition);

        // Change to page move method
        window.location.href = `https://memic.at/articles/${article.id}`;
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
    c.querySelectorAll('app-article-list-item, div[data-userscript-generated]').forEach(el => el.remove());
  }

  function createPaginationBar() {
    const bar = document.createElement('div');
    bar.setAttribute('data-userscript-generated', 'true');
    bar.classList.add('userscript-pagination');
    bar.style.textAlign = 'center';
    bar.style.margin = '1em 0';
    for (let i = 0; i < MAX_PAGES; i++) {
      const btn = document.createElement('button');
      btn.textContent = i + 1;
      btn.dataset.page = i;
      btn.style.margin = '0 4px';
      btn.style.padding = '4px 8px';
      btn.style.border = '1px solid #ccc';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      bar.appendChild(btn);
    }
    updatePaginationBar(bar);
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

  function updatePaginationBar(bar) {
    bar.querySelectorAll('button').forEach((b, idx) => {
      b.style.backgroundColor = idx === currentPage ? '#4FC3F7' : '#2a2a2a';
      b.style.color = idx === currentPage ? '#fff' : '#e0e0e0';
      b.style.fontWeight = idx === currentPage ? 'bold' : 'normal';
    });
  }

  function syncPaginationBars() {
    document.querySelectorAll('.userscript-pagination').forEach(updatePaginationBar);
  }

  function preventScroll() {
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.addedNodes.length) {
          container.querySelectorAll('app-article-list-item:not([data-userscript-generated])').forEach(el => el.remove());
        }
      });
    }).observe(container, { childList: true, subtree: true });
  }

  function observeAndInit() {
    new MutationObserver((muts, obs) => {
      const c = document.querySelector('app-article-list-item')?.parentElement;
      if (c) {
        obs.disconnect();
        container = c;
        runMain();
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  async function runMain() {
    const list = await loadPagesSequentially(currentPage);
    clearArticles(container);
    renderArticles(container, list);

    // Remove an existing PageNation bar and create a new one
    clearPaginationBars();
    const top = createPaginationBar();
    const bottom = createPaginationBar();
    container.parentElement.insertBefore(top, container);
    container.parentElement.appendChild(bottom);

    preventScroll();
    // Restore scroll position if saved
    const savedScroll = sessionStorage.getItem('lastScroll');
    if (savedScroll) window.scrollTo(0, parseInt(savedScroll));
  }

  // Function for backward processing (when you return to the post list page)
  window.addEventListener('popstate', async (event) => {
    if (!container) return;

    // Restore saved pages and scroll locations
    const savedPage = sessionStorage.getItem('lastPage');
    const savedScroll = sessionStorage.getItem('lastScroll');

    if (savedPage) {
      currentPage = parseInt(savedPage);
      const list = await loadPagesSequentially(currentPage);
      clearArticles(container);
      renderArticles(container, list);

      // Remove an existing PageNation Bar
      clearPaginationBars();

      // Create a new PageNation Bar
      const top = createPaginationBar();
      const bottom = createPaginationBar();
      container.parentElement.insertBefore(top, container);
      container.parentElement.appendChild(bottom);

      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScroll));
        }, 100);
      }
    }
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      runMain();
    }
  });

  observeAndInit();
})();
