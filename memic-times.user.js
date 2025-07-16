// ==UserScript==
// @name         미밐 정확한 시간 표시
// @namespace    https://memic.at/
// @version      1.2.1
// @description  Converting Relative Time to Correct Date/Time
// @match        *://memic.at/*
// @match        *://shelter.id/*
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
        } else if (text.includes('일 전')) {
            const day = parseInt(text);
            d.setDate(d.getDate() - day);
        } else if (/^\d{1,2}:\d{2}$/.test(text)) {
            // Ex: "14:02" → Today's date + time
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
        // Add new selectors - tailor to the structure shown in the image
        const timeSelectors = [
            'td.text-right',
            '.text-right',
            'time.typo-body-sm',
            'time[datetime]',  // Time tag with datetime property
            '.typo-body-sm',   // Select by class name only
            'time',            // All time tags
            '.time',           // time class
            '[class*="time"]'  // Classes with time
        ];

        timeSelectors.forEach(selector => {
            const timeElems = document.querySelectorAll(selector);
            timeElems.forEach(el => {
                // Skip elements that have already been processed
                if (el.hasAttribute('data-time-converted')) return;

                const original = el.textContent.trim();

                // Skip blank text or already converted forms
                if (!original || original.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) return;

                const parsed = parseRelativeTime(original);
                if (parsed) {
                    el.textContent = formatDate(parsed);
                    el.title = original; // Keep original as Title
                    el.style.fontSize = '0.75em';
                    el.setAttribute('data-time-converted', 'true'); // Show Processing Completed
                }
            });
        });
    }

    // Initial Run - Slight delay after page loading
    setTimeout(updateTimestamps, 1500);

    // For dynamic content detection, MutationObserver
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Update only when new nodes are added
                shouldUpdate = true;
            }
        });

        if (shouldUpdate) {
            setTimeout(updateTimestamps, 100); // Update after slight delay
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Update even when focused on the page (when you return from another tab)
    window.addEventListener('focus', () => {
        setTimeout(updateTimestamps, 500);
    });
})();
