// ==UserScript==
// @name         Scroll Percentage Badge
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Adds a badge showing the current section name and scroll percentage. Native hover tooltips added to dropdown menu items to preview full truncated section headers.
// @author       PixelSpark987 - https://is.gd/PS987
// @downloadURL  https://raw.githubusercontent.com/PixelSpark987/Scroll-Percentage-Badge/refs/heads/main/Scroll-Percentage-Badge.js
// @updateURL    https://raw.githubusercontent.com/PixelSpark987/Scroll-Percentage-Badge/refs/heads/main/Scroll-Percentage-Badge.js
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        // Opacity Levels
        activeOpacity: '1.0',
        inactiveOpacity: '0.25',

        // Animation Timings (in milliseconds)
        fadeDelay: 3000,       // Time before badge fades out due to inactivity
        transitionTime: 500,   // Transition time for fading in/out (0.5s)
        longPressDelay: 300,   // Time holding down before drag mode activates

        // Styling Details
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        badgePadding: '5px 10px',
        borderRadius: '20px',
        zIndex: '1000000000'
    };
    // =======================================================

    let lastActiveScroller = null;
    let fadeTimeout = null;
    let currentPercent = -1; 
    let currentSectionText = ""; 
    let currentUrl = location.href;

    // Drag and Snap State System
    let isDragging = false;
    let isMouseDown = false;
    let longPressTimeout = null;
    let startX = 0;
    let startY = 0;

    // Menu and Layout Structural Tracking
    let menuElement = null;
    let badgeWrapper = null;
    let homeBadgeElement = null;
    let endBadgeElement = null;
    let isMenuOpen = false;

    // Create the badge element
    const badge = document.createElement('div');
    badge.id = 'tm-scroll-percentage-badge';

    // Set the initial home coordinates
    function resetToHomePosition() {
        badge.style.removeProperty('bottom');
        badge.style.removeProperty('left');
        badge.style.setProperty('top', '10px', 'important');
        badge.style.setProperty('right', '12px', 'important');
        closeHeaderMenu();
    }

    // Style the badge with a clean, flat aesthetic (No shadows)
    badge.style.setProperty('position', 'fixed', 'important');
    resetToHomePosition();
    badge.style.setProperty('padding', CONFIG.badgePadding, 'important');
    badge.style.setProperty('border-radius', CONFIG.borderRadius, 'important');
    badge.style.setProperty('color', '#ffffff', 'important');
    badge.style.setProperty('font-weight', 'bold', 'important');
    badge.style.setProperty('font-size', CONFIG.fontSize, 'important');
    badge.style.setProperty('font-family', CONFIG.fontFamily, 'important');
    badge.style.setProperty('z-index', CONFIG.zIndex, 'important');
    badge.style.setProperty('cursor', 'pointer', 'important');
    badge.style.setProperty('display', 'block', 'important');
    badge.style.setProperty('user-select', 'none', 'important');

    // Set dynamic animation speeds using config variables
    badge.style.setProperty('transition', `background-color 0.05s ease, transform 0.1s ease, opacity ${CONFIG.transitionTime}ms ease`, 'important');
    badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');

    document.documentElement.appendChild(badge);

    // Fade Management Core
    function resetFadeTimer() {
        if (fadeTimeout) clearTimeout(fadeTimeout);

        if (!badge.matches(':hover') && !isDragging && !isMenuOpen) {
            badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
        }

        fadeTimeout = setTimeout(() => {
            if (!badge.matches(':hover') && !isDragging && !isMenuOpen) {
                badge.style.setProperty('opacity', CONFIG.inactiveOpacity, 'important');
            }
        }, CONFIG.fadeDelay);
    }

    // Process drag physics tracking loop
    function onMouseMove(e) {
        if (!isMouseDown) return;

        if (!isDragging) {
            const moveX = Math.abs(e.clientX - startX);
            const moveY = Math.abs(e.clientY - startY);
            if (moveX > 3 || moveY > 3) {
                isDragging = true;
                closeHeaderMenu(); 
                badge.style.setProperty('transition', 'none', 'important');
                badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
            }
        }

        if (isDragging) {
            const x = e.clientX;
            const y = e.clientY;
            
            badge.style.removeProperty('right');
            badge.style.removeProperty('bottom');
            badge.style.setProperty('top', `${y - 12}px`, 'important');
            badge.style.setProperty('left', `${x - 40}px`, 'important');
        }
    }

    // Process snapping boundaries execution on mouse release
    function onMouseUp(e) {
        if (longPressTimeout) clearTimeout(longPressTimeout);
        isMouseDown = false;

        if (isDragging) {
            isDragging = false;
            badge.style.setProperty('transition', `background-color 0.05s ease, transform 0.1s ease, opacity ${CONFIG.transitionTime}ms ease, top 0.2s ease, left 0.2s ease, right 0.2s ease, bottom 0.2s ease`, 'important');
            
            const x = e.clientX;
            const y = e.clientY;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;

            badge.style.removeProperty('top');
            badge.style.removeProperty('left');
            badge.style.removeProperty('right');
            badge.style.removeProperty('bottom');

            const corners = [
                { name: 'topLeft',     x: 0,        y: 0 },
                { name: 'topRight',    x: winWidth, y: 0 },
                { name: 'bottomLeft',  x: 0,        y: winHeight }
            ];

            let closestCorner = corners[0];
            let minDistance = Infinity;

            for (const corner of corners) {
                const distance = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCorner = corner;
                }
            }

            if (closestCorner.name === 'topLeft') {
                badge.style.setProperty('top', '10px', 'important');
                badge.style.setProperty('left', '12px', 'important');
            } else if (closestCorner.name === 'topRight') {
                badge.style.setProperty('top', '10px', 'important');
                badge.style.setProperty('right', '12px', 'important');
            } else if (closestCorner.name === 'bottomLeft') {
                badge.style.setProperty('bottom', '10px', 'important');
                badge.style.setProperty('left', '12px', 'important');
            }

            resetFadeTimer();
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            return;
        }

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        toggleHeaderMenu();
    }

    // Setup listener hooks tracking dragging initialization variables
    badge.onmousedown = function(e) {
        e.preventDefault();
        isMouseDown = true;
        startX = e.clientX;
        startY = e.clientY;

        if (longPressTimeout) clearTimeout(longPressTimeout);

        longPressTimeout = setTimeout(() => {
            if (isMouseDown) {
                isDragging = true;
                closeHeaderMenu();
                badge.style.setProperty('transition', 'none', 'important');
                badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
            }
        }, CONFIG.longPressDelay);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Collapse layouts cleanly and restore fixed position properties safely
    function closeHeaderMenu() {
        isMenuOpen = false;
        
        if (menuElement) {
            menuElement.remove();
            menuElement = null;
        }

        if (badgeWrapper) {
            const isLeft = badgeWrapper.style.left !== '';
            const isBottom = badgeWrapper.style.bottom !== '';
            const wrapperRect = badgeWrapper.getBoundingClientRect();
            
            document.documentElement.appendChild(badge);
            
            badge.style.setProperty('position', 'fixed', 'important');
            
            if (isBottom) {
                badge.style.setProperty('bottom', '10px', 'important');
                badge.style.removeProperty('top');
            } else {
                badge.style.setProperty('top', '10px', 'important');
                badge.style.removeProperty('bottom');
            }
            
            if (isLeft) {
                badge.style.setProperty('left', '12px', 'important');
                badge.style.removeProperty('right');
            } else {
                badge.style.setProperty('right', '12px', 'important');
                badge.style.removeProperty('left');
            }

            badgeWrapper.remove();
            badgeWrapper = null;
            homeBadgeElement = null;
            endBadgeElement = null;
        }

        resetFadeTimer();
    }

    // Comprehensive scanner engine to find both structural headers and heavily styled text titles
    function findWebpageHeaders() {
        const candidates = document.querySelectorAll('h1, h2, h3, [role="heading"], section[id], article[id], strong, b, span, p, div.title, .heading, [class*="title" i], [class*="heading" i]');
        const validHeaders = [];
        const seenTexts = new Set();
        const seenTops = new Set(); 

        candidates.forEach(el => {
            if (el.id === 'tm-scroll-percentage-badge' || el.id === 'tm-scroll-home-badge' || el.id === 'tm-scroll-end-badge' || el.closest('#tm-scroll-badge-menu') || el.id === 'tm-badge-wrapper') return;

            const text = (el.innerText || el.getAttribute('aria-label') || el.id || "").trim();
            if (text.length < 2 || text.length > 60 || seenTexts.has(text)) return;

            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            const roundTop = Math.round(rect.top);
            
            const isSemanticHeader = /^(H1|H2|H3)$/i.test(el.tagName) || el.getAttribute('role') === 'heading' || el.classList.contains('title') || el.classList.contains('heading');
            const fontWeight = parseInt(style.fontWeight) || 400;
            const fontSize = parseFloat(style.fontSize) || 12;

            if (isSemanticHeader || (fontWeight >= 700 && fontSize >= 13 && text.indexOf('\n') === -1)) {
                if (el.parentElement && (validHeaders.includes(el.parentElement) || /^(H1|H2|H3)$/i.test(el.parentElement.tagName))) return;
                
                if (seenTops.has(roundTop) && !isSemanticHeader) return;

                validHeaders.push(el);
                seenTexts.add(text);
                seenTops.add(roundTop);
            }
        });

        return validHeaders;
    }

    // Helper to generate simple matching buttons natively
    function createCompanionButton(id, label, clickAction) {
        const btn = document.createElement('div');
        btn.id = id;
        btn.innerText = label;
        btn.style.cssText = `
            padding: ${CONFIG.badgePadding} !important;
            border-radius: ${CONFIG.borderRadius} !important;
            background-color: #242424 !important;
            color: #ffffff !important;
            font-weight: bold !important;
            font-size: ${CONFIG.fontSize} !important;
            font-family: ${CONFIG.fontFamily} !important;
            cursor: pointer !important;
            user-select: none !important;
            white-space: nowrap !important;
            display: inline-block !important;
            transition: transform 0.1s ease, background-color 0.15s ease !important;
        `;

        btn.onmouseenter = () => { btn.style.backgroundColor = '#363636'; btn.style.transform = 'scale(1.05)'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = '#242424'; btn.style.transform = 'scale(1)'; };
        
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            clickAction();
            closeHeaderMenu();
        };

        return btn;
    }

    // Main overlay dropdown generator loop
    function toggleHeaderMenu() {
        if (isMenuOpen) {
            closeHeaderMenu();
            return;
        }

        isMenuOpen = true;
        badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');

        const headers = findWebpageHeaders();
        const badgeRect = badge.getBoundingClientRect();
        const activeScrollerElement = getActiveScrollerElement();
        const scroller = getScrollerData();

        const midPointX = window.innerWidth / 2;
        const midPointY = window.innerHeight / 2;
        const isLeftScreenSide = badgeRect.left < midPointX;
        const isBottomScreenSide = badgeRect.top > midPointY;

        // Create navigation action blocks
        const jumpToTop = () => {
            if (!activeScrollerElement || activeScrollerElement === document.documentElement || activeScrollerElement === document.body) {
                window.scrollTo({ top: 0, behavior: 'auto' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            } else if (typeof activeScrollerElement.scrollTo === 'function') {
                activeScrollerElement.scrollTo({ top: 0, behavior: 'auto' });
                activeScrollerElement.scrollTop = 0;
            }
            updateScrollBadge();
        };

        const jumpToBottom = () => {
            const maxScroll = activeScrollerElement ? activeScrollerElement.scrollHeight : document.documentElement.scrollHeight;
            if (!activeScrollerElement || activeScrollerElement === document.documentElement || activeScrollerElement === document.body) {
                window.scrollTo({ top: maxScroll, behavior: 'auto' });
                document.documentElement.scrollTop = maxScroll;
                document.body.scrollTop = maxScroll;
            } else if (typeof activeScrollerElement.scrollTo === 'function') {
                activeScrollerElement.scrollTo({ top: maxScroll, behavior: 'auto' });
                activeScrollerElement.scrollTop = maxScroll;
            }
            updateScrollBadge();
        };

        // RENDER FLEX WRAPPER CONTAINER: Uses hard layouts to anchor to boundaries safely
        badgeWrapper = document.createElement('div');
        badgeWrapper.id = 'tm-badge-wrapper';
        badgeWrapper.style.cssText = `
            position: fixed !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            z-index: ${CONFIG.zIndex} !important;
            pointer-events: auto !important;
            flex-direction: row !important;
        `;

        if (isBottomScreenSide) {
            badgeWrapper.style.setProperty('bottom', '10px', 'important');
            badgeWrapper.style.removeProperty('top');
        } else {
            badgeWrapper.style.setProperty('top', '10px', 'important');
            badgeWrapper.style.removeProperty('bottom');
        }

        homeBadgeElement = createCompanionButton('tm-scroll-home-badge', 'HOME', jumpToTop);
        endBadgeElement = createCompanionButton('tm-scroll-end-badge', 'END', jumpToBottom);

        badge.style.setProperty('position', 'static', 'important');
        document.documentElement.appendChild(badgeWrapper);

        if (isLeftScreenSide) {
            badgeWrapper.style.setProperty('left', '12px', 'important');
            badgeWrapper.style.removeProperty('right');
            
            badgeWrapper.appendChild(badge);
            badgeWrapper.appendChild(homeBadgeElement);
            badgeWrapper.appendChild(endBadgeElement);
        } else {
            badgeWrapper.style.setProperty('right', '12px', 'important');
            badgeWrapper.style.removeProperty('left');
            
            badgeWrapper.appendChild(homeBadgeElement);
            badgeWrapper.appendChild(endBadgeElement);
            badgeWrapper.appendChild(badge);
        }

        if (headers.length === 0) {
            setupOutsideClickTrap();
            return;
        }

        // Build dropdown list layout container
        menuElement = document.createElement('div');
        menuElement.id = 'tm-scroll-badge-menu';
        menuElement.style.cssText = `
            position: fixed !important;
            background: #1e1e1e !important;
            border: 1px solid #333333 !important;
            border-radius: 8px !important;
            padding: 6px 0 !important;
            max-height: 300px !important;
            overflow-y: auto !important;
            width: 220px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
            z-index: ${CONFIG.zIndex} !important;
            font-family: ${CONFIG.fontFamily} !important;
            font-size: 11px !important;
            user-select: none !important;
        `;

        const wrapperRect = badgeWrapper.getBoundingClientRect();

        if (isLeftScreenSide) {
            menuElement.style.setProperty('left', '12px', 'important');
            menuElement.style.removeProperty('right');
        } else {
            menuElement.style.setProperty('right', '12px', 'important');
            menuElement.style.removeProperty('left');
        }

        if (isBottomScreenSide) {
            menuElement.style.setProperty('bottom', `${window.innerHeight - wrapperRect.top + 6}px`, 'important');
            menuElement.style.removeProperty('top');
        } else {
            menuElement.style.setProperty('top', `${wrapperRect.bottom + 6}px`, 'important');
            menuElement.style.removeProperty('bottom');
        }

        const totalScrollable = Math.max(scroller.height - scroller.client, 1);

        headers.forEach((header) => {
            let originalText = header.innerText || header.getAttribute('aria-label') || header.id || "";
            originalText = originalText.trim().replace(/[\r\n\t]+/g, " ");

            let titleText = originalText;
            if (titleText.length > 28) titleText = titleText.substring(0, 25) + "...";

            let absoluteTop = 0;
            if (activeScrollerElement && activeScrollerElement !== document.documentElement && activeScrollerElement !== document.body) {
                const scrollerRect = activeScrollerElement.getBoundingClientRect();
                const headerRect = header.getBoundingClientRect();
                absoluteTop = (headerRect.top - scrollerRect.top) + activeScrollerElement.scrollTop;
            } else {
                const headerRect = header.getBoundingClientRect();
                absoluteTop = headerRect.top + window.scrollY;
            }

            let targetPercent = (absoluteTop / totalScrollable) * 100;
            if (scroller.top === 0 && absoluteTop < 150) {
                targetPercent = 0;
            }
            targetPercent = Math.min(Math.max(targetPercent, 0), 100);
            
            const itemHue = (targetPercent / 100) * 360;
            const percentageString = ` (${Math.round(targetPercent)}%)`;

            const item = document.createElement('div');
            item.style.cssText = `
                padding: 6px 12px !important;
                cursor: pointer !important;
                color: hsl(${itemHue}, 85%, 55%) !important;
                font-weight: bold !important;
                transition: background 0.15s ease !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            `;
            item.innerText = `${titleText}${percentageString}`;

            // Pinned HTML title attribute creates native browser hover tooltips for cut off items
            item.setAttribute('title', `${originalText}${percentageString}`);

            item.onmouseenter = () => { item.style.background = '#2d2d2d'; };
            item.onmouseleave = () => { item.style.background = 'transparent'; };

            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const scrollPaddingOffset = 15; 
                const finalScrollTarget = Math.max(absoluteTop - scrollPaddingOffset, 0);

                if (!activeScrollerElement || activeScrollerElement === document.documentElement || activeScrollerElement === document.body) {
                    window.scrollTo({ top: finalScrollTarget, behavior: 'auto' });
                    document.documentElement.scrollTop = finalScrollTarget;
                    document.body.scrollTop = finalScrollTarget;
                } else if (typeof activeScrollerElement.scrollTo === 'function') {
                    activeScrollerElement.scrollTo({ top: finalScrollTarget, behavior: 'auto' });
                    activeScrollerElement.scrollTop = finalScrollTarget;
                }

                closeHeaderMenu();
                updateScrollBadge();
            };

            menuElement.appendChild(item);
        });

        document.documentElement.appendChild(menuElement);
        setupOutsideClickTrap();
    }

    // Global outside click management block
    function setupOutsideClickTrap() {
        setTimeout(() => {
            const closeTrap = (e) => {
                if (!isMenuOpen) {
                    document.removeEventListener('mousedown', closeTrap);
                    return;
                }
                
                const clickedMenu = menuElement && menuElement.contains(e.target);
                const clickedWrapper = badgeWrapper && badgeWrapper.contains(e.target);

                if (!clickedMenu && !clickedWrapper) {
                    closeHeaderMenu();
                    document.removeEventListener('mousedown', closeTrap);
                }
            };
            document.addEventListener('mousedown', closeTrap);
        }, 10);
    }

    badge.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
    };

    // Hover Event Tracking
    badge.onmouseenter = () => {
        if (fadeTimeout) clearTimeout(fadeTimeout);
        badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
        badge.style.setProperty('transform', 'scale(1.08)', 'important');
    };
    badge.onmouseleave = () => {
        badge.style.setProperty('transform', 'scale(1)', 'important');
        resetFadeTimer();
    };

    document.addEventListener('scroll', function(e) {
        const target = e.target === document ? document.documentElement : e.target;

        if (target && target.scrollHeight > target.clientHeight) {
            lastActiveScroller = target;
            updateScrollBadge();
        }
    }, true);

    function getActiveScrollerElement() {
        let target = lastActiveScroller;
        if (!target) {
            const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            if (winScroll > 0) {
                target = document.documentElement;
            } else {
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.scrollTop > 0) {
                        target = el;
                        break;
                    }
                }
            }
        }
        return target;
    }

    function getCurrentSectionName() {
        const headers = findWebpageHeaders();
        let currentSection = "";
        let bestHeading = null;
        let maxNegativeTop = -Infinity;
        const activeScrollerElement = getActiveScrollerElement();

        for (const header of headers) {
            const rect = header.getBoundingClientRect();
            
            let comparativeTop = rect.top;
            if (activeScrollerElement && activeScrollerElement !== document.documentElement && activeScrollerElement !== document.body) {
                const scrollerRect = activeScrollerElement.getBoundingClientRect();
                comparativeTop = rect.top - scrollerRect.top;
            }

            if (comparativeTop <= 130 && comparativeTop >= -30) {
                if (comparativeTop > maxNegativeTop) {
                    maxNegativeTop = comparativeTop;
                    bestHeading = header;
                }
            }
        }

        if (bestHeading) {
            currentSection = bestHeading.innerText || bestHeading.getAttribute('aria-label') || bestHeading.id || "";
            currentSection = currentSection.trim().replace(/[\r\n\t]+/g, " ");
            
            if (currentSection.length > 25) {
                currentSection = currentSection.substring(0, 22) + "...";
            }
        }

        return currentSection;
    }

    function getScrollerData() {
        const target = getActiveScrollerElement();

        if (target === document.documentElement || target === document.body || !target) {
            const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            const winHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const winClient = document.documentElement.clientHeight || window.innerHeight;
            return { top: winScroll, height: winHeight, client: winClient };
        }

        return { top: target.scrollTop, height: target.scrollHeight, client: target.clientHeight };
    }

    function updateScrollBadge() {
        if (location.href !== currentUrl) {
            currentUrl = location.href;
            resetToHomePosition();
        }

        const scroller = getScrollerData();
        const totalScrollable = scroller.height - scroller.client;

        let scrolledPercent = 0;
        if (totalScrollable > 0) {
            scrolledPercent = Math.min(Math.max((scroller.top / totalScrollable) * 100, 0), 100);
        }

        const roundedPercent = Math.round(scrolledPercent);
        const activeSectionText = getCurrentSectionName();

        if (roundedPercent !== currentPercent || activeSectionText !== currentSectionText) {
            currentPercent = roundedPercent;
            currentSectionText = activeSectionText;
            resetFadeTimer();
        }

        const hue = (scrolledPercent / 100) * 360;

        badge.innerText = activeSectionText ? `${activeSectionText} - ${roundedPercent}%` : `${roundedPercent}%`;
        badge.style.setProperty('background-color', `hsl(${hue}, 85%, 45%)`, 'important');
    }

    window.addEventListener('resize', updateScrollBadge);
    setInterval(updateScrollBadge, 300);
    updateScrollBadge();
})();
