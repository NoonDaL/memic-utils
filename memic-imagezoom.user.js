// ==UserScript==
// @name         이미지 확대/축소 스크립트
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Provides zoom and drag functionality for images in modal popup when clicked
// @match        *://memic.at/*
// @match        *://shelter.id/*
// @grant        none
// @author       NoonDaL
// ==/UserScript==

(function() {
    'use strict';

    // Add image click event listener
    function addImageZoomFeature() {
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'IMG' && e.target.src && !e.target.closest('.userscript-zoom-modal')) {
                // Exclude images with non-empty alt attributes (typically decorative images)
                if (e.target.alt && e.target.alt.trim() !== '' && e.target.alt !== '댓글 이미지') {
                    return;
                }

                // Check if image is in article content or comment area
                const isInArticleContent = e.target.closest('app-article-content, .article-content, [class*="article"], [class*="content"]');
                const isInCommentArea = e.target.closest('app-comment, .comment, [class*="comment"], [class*="reply"]');

                if (isInArticleContent || isInCommentArea) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // Remove existing modals and create new modal
                    setTimeout(() => {
                        const originalModals = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="popup"]');
                        originalModals.forEach(modal => {
                            if (modal.style.zIndex && parseInt(modal.style.zIndex) > 1000) {
                                modal.remove();
                            }
                        });

                        showImageZoomModal(e.target.src);
                    }, 10);
                }
            }
        }, true);
    }

    // Show image zoom modal function
    function showImageZoomModal(imageSrc) {
        // Remove existing modals
        const existingModals = document.querySelectorAll('.userscript-zoom-modal, [class*="modal"], [class*="overlay"], [class*="popup"]');
        existingModals.forEach(modal => {
            if (modal.style.zIndex && parseInt(modal.style.zIndex) > 100) {
                modal.remove();
            }
        });

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'userscript-zoom-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        `;

        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            position: relative;
            width: 90vw;
            height: 90vh;
            overflow: hidden;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create image element
        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.cssText = `
            transition: transform 0.1s ease;
            transform-origin: center center;
            display: block;
            pointer-events: none;
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.8);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            font-size: 24px;
            cursor: pointer;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Zoom and drag variables
        let scale = 1;
        let initialScale = 1;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let translateX = 0;
        let translateY = 0;

        // Calculate initial scale
        function calculateInitialScale() {
            const containerWidth = imageContainer.clientWidth;
            const containerHeight = imageContainer.clientHeight;
            const imageWidth = img.naturalWidth;
            const imageHeight = img.naturalHeight;

            if (imageWidth && imageHeight) {
                const scaleX = containerWidth / imageWidth;
                const scaleY = containerHeight / imageHeight;
                initialScale = Math.min(scaleX, scaleY, 1);
                scale = initialScale;
            }
        }

        // Update transform
        function updateTransform() {
            img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        }

        // Mouse wheel event (zoom in/out)
        imageContainer.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(initialScale * 0.1, Math.min(5, scale + delta));

            if (newScale !== scale) {
                const rect = imageContainer.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const scaleRatio = newScale / scale;
                translateX = mouseX - (mouseX - translateX) * scaleRatio;
                translateY = mouseY - (mouseY - translateY) * scaleRatio;

                scale = newScale;

                // Reset position when returning to original size
                if (scale === initialScale) {
                    translateX = 0;
                    translateY = 0;
                }

                updateTransform();
            }
        });

        // Mouse drag events
        imageContainer.addEventListener('mousedown', function(e) {
            if (scale > initialScale) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                imageContainer.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            }
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                imageContainer.style.cursor = scale > initialScale ? 'grab' : 'zoom-out';
            }
        });

        // Modal close function
        function closeModal() {
            modal.remove();
        }

        // Register event listeners
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close modal with ESC key
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Add elements to modal
        imageContainer.appendChild(img);
        modal.appendChild(imageContainer);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);

        // Set initial scale after image load
        img.onload = function() {
            calculateInitialScale();
            updateTransform();
        };
    }

    // Initialize script
    addImageZoomFeature();
})();
