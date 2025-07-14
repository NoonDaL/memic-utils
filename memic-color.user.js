// ==UserScript==
// @name         미밐 카테고리 색상 강조
// @namespace    http://memic.at/
// @version      1.1
// @description  Apply color to post tag and left sidebar categories
// @match        https://memic.at/*
// @grant        none
// @author       NoonDaL
// ==/UserScript==

(function () {
    'use strict';

    // Color definition
    const categoryColors = {
        '공지': '#FF5C5C',
        '자유': '#4FC3F7',
        '후방주의': '#FF8A80',
        '소식': '#9575CD',
        '창작': '#FFB74D',
        '질문': '#4DB6AC',
        '공략': '#81C784',
        '애니': '#BA68C8',
        '스포/유출': '#F06292',
        '굿즈/후기': '#A1887F',
        '대리가챠': '#90A4AE',
        '컨텐츠 추천': '#7986CB',
        '클립': '#64B5F6',
        '이벤트': '#FFD54F'
    };

    // Apply post tags color
    function colorizePostPrefixes() {
        const postLinks = document.querySelectorAll('a.border-b-on-background-variant2');

        postLinks.forEach(link => {
            const prefix = link.querySelector('span');
            if (!prefix) return;

            const text = prefix.textContent.trim();
            const color = categoryColors[text];
            if (color) {
                prefix.style.color = color;
                prefix.style.fontWeight = 'bold';
            }
        });
    }

    // Apply sidebar categories color
    function colorizeSidebarCategories() {
       const anchors = document.querySelectorAll('a.truncate');

        anchors.forEach(a => {
            const span = a.querySelector('span');
            if (!span) return;

            const text = span.textContent.trim();

            if (categoryColors[text]) {
                span.style.color = categoryColors[text];
                span.style.fontWeight = 'bold';
            }
        });
    }

        // 게시글의 span.bg-background 말머리에도 색상 배경 적용
    function colorizePostSpanTags() {
        const spans = document.querySelectorAll('span.bg-background');
        spans.forEach(span => {
            const text = span.textContent.trim();
            const color = categoryColors[text];
            if (color) {
                span.style.backgroundColor = color;
                span.style.color = '#ffffff';
                span.style.fontWeight = 'bold';
            }
        });
    }

    function applyAll() {
        colorizePostSpanTags();
        colorizePostPrefixes();
        colorizeSidebarCategories();
    }

    // Initial Run
    setTimeout(applyAll, 500);

    // Change Detection
    new MutationObserver(() => {
        applyAll();
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
})();
