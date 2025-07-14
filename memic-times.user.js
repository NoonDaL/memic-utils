// ==UserScript==
// @name         미밐 정확한 시간 표시
// @namespace    https://memic.at/
// @version      1.1
// @description  Converting Relative Time to Correct Date/Time
// @match        *://memic.at/*
// @grant        none
// @author       NoonDaL
// ==/UserScript==

(function() {
    'use strict';

    function parseRelativeTime(text) {
        const now = new Date();
        const d = new Date(now);


        if (text.includes('방금')) return now;

        if (text.includes('초 전')) {
            const sec = parseInt(text);
            d.setSeconds(d.getSeconds() - sec);
        } else if (text.includes('분 전')) {
            const min = parseInt(text);
            d.setMinutes(d.getMinutes() - min);
        } else if (text.includes('시간 전')) {
            const hour = parseInt(text);
            d.setHours(d.getHours() - hour);
        } else if (text.includes('어제')) {
            d.setDate(d.getDate() - 1);
        } else if (text.includes('그저께')) {
            d.setDate(d.getDate() - 2);
        } else if (text.includes('전')) {
            // Ex: 3일 전
            const day = parseInt(text);
            d.setDate(d.getDate() - day);
        } else if (/^\d{1,2}:\d{2}$/.test(text)) {
            // Ex: "14:02" → 오늘 날짜 + 시간
            const [h, m] = text.split(':').map(Number);
            d.setHours(h);
            d.setMinutes(m);
            d.setSeconds(0);
        } else {
            return null; // unknown format
        }

        return d;
    }

    function formatDate(date) {
        return date.getFullYear() + '-' +
               String(date.getMonth() + 1).padStart(2, '0') + '-' +
               String(date.getDate()).padStart(2, '0') + ' ' +
               String(date.getHours()).padStart(2, '0') + ':' +
               String(date.getMinutes()).padStart(2, '0') + ':' +
               String(date.getSeconds()).padStart(2, '0');
    }

    function updateTimestamps() {
        // Find all timed elements
        const timeElems = document.querySelectorAll('td.text-right, .text-right, time.typo-body-sm'); // Modifiable
        timeElems.forEach(el => {
            const original = el.textContent.trim();
            const parsed = parseRelativeTime(original);
            if (parsed) {
                el.textContent = formatDate(parsed);
                el.title = original; // Keep original as Title
            }
        });
    }

    // Initial Run
    setTimeout(updateTimestamps, 1500);

    // If it's a bulletin board page, it can also be dynamically detected
    const observer = new MutationObserver(() => {
        updateTimestamps();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
