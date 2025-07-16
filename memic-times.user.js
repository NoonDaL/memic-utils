// ==UserScript==
// @name         미밐 정확한 시간 표시
// @namespace    https://memic.at/
// @version      1.2.2
// @description  Convert relative time to fixed absolute time with uniform font size
// @match        *://memic.at/*
// @match        *://shelter.id/*
// @grant        none
// @author       NoonDaL
// ==/UserScript==

(function() {
    'use strict';

    // 1. 공통 스타일 삽입 (한 번만)
    const style = document.createElement('style');
    style.textContent = `
        .fixed-time-format {
            font-size: inherit !important;
            font-family: inherit !important;
        }
    `;
    document.head.appendChild(style);

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
        } else if (text.includes('일 전')) {
            const day = parseInt(text);
            d.setDate(d.getDate() - day);
        } else if (/^\d{1,2}:\d{2}$/.test(text)) {
            const [h, m] = text.split(':').map(Number);
            d.setHours(h);
            d.setMinutes(m);
            d.setSeconds(0);
        } else {
            return null;
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
        const timeSelectors = [
            'td.text-right',
            '.text-right',
            'time.typo-body-sm',
            'time[datetime]',
            '.typo-body-sm',
            'time',
            '.time',
            '[class*="time"]'
        ];

        timeSelectors.forEach(selector => {
            const timeElems = document.querySelectorAll(selector);
            timeElems.forEach(el => {
                if (el.hasAttribute('data-time-converted')) return;

                const original = el.textContent.trim();
                if (!original || original.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) return;

                let parsed = null;

                if (el.hasAttribute('datetime')) {
                    const datetime = el.getAttribute('datetime');
                    parsed = new Date(datetime);
                } else {
                    parsed = parseRelativeTime(original);
                }

                if (parsed && !isNaN(parsed.getTime())) {
                    el.textContent = formatDate(parsed);
                    el.title = original;
                    el.classList.add('fixed-time-format');
                    el.setAttribute('data-time-converted', 'true');
                }
            });
        });
    }

    setTimeout(updateTimestamps, 1500);

    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldUpdate = true;
            }
        });

        if (shouldUpdate) {
            setTimeout(updateTimestamps, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.addEventListener('focus', () => {
        setTimeout(updateTimestamps, 500);
    });
})();
