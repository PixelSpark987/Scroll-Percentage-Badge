// ==UserScript==
// @name         Scroll Percentage Badge
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Adds a badge in the top-right corner showing the current scroll percentage. Click to jump to the top or bottom. Long-press and drag to snap to top-left, top-right, or bottom-left corners.
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
    let currentPercent = -1; // Keep track of the last rendered percentage
    let currentUrl = location.href;

    // Drag and Snap State System
    let isDragging = false;
    let isMouseDown = false;
    let longPressTimeout = null;
    let startX = 0;
    let startY = 0;

    // Create the badge element
    const badge = document.createElement('div');
    badge.id = 'tm-scroll-percentage-badge';

    // Set the initial home coordinates
    function resetToHomePosition() {
        badge.style.removeProperty('bottom');
        badge.style.removeProperty('left');
        badge.style.setProperty('top', '10px', 'important');
        badge.style.setProperty('right', '12px', 'important');
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

        if (!badge.matches(':hover') && !isDragging) {
            badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
        }

        fadeTimeout = setTimeout(() => {
            if (!badge.matches(':hover') && !isDragging) {
                badge.style.setProperty('opacity', CONFIG.inactiveOpacity, 'important');
            }
        }, CONFIG.fadeDelay);
    }

    // Process drag physics tracking loop
    function onMouseMove(e) {
        if (!isMouseDown) return;

        if (!isDragging) {
            // Check if mouse has moved past a tiny threshold to initiate a true drag event action
            const moveX = Math.abs(e.clientX - startX);
            const moveY = Math.abs(e.clientY - startY);
            if (moveX > 3 || moveY > 3) {
                isDragging = true;
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
            badge.style.setProperty('left', `${x - 20}px`, 'important');
        }
    }

    // Process snapping boundaries execution on mouse release
    function onMouseUp(e) {
        if (longPressTimeout) clearTimeout(longPressTimeout);
        isMouseDown = false;

        if (isDragging) {
            isDragging = false;
            
            // Re-enable smooth transition animations for snapping back into position properties
            badge.style.setProperty('transition', `background-color 0.05s ease, transform 0.1s ease, opacity ${CONFIG.transitionTime}ms ease, top 0.2s ease, left 0.2s ease, right 0.2s ease, bottom 0.2s ease`, 'important');
            
            const x = e.clientX;
            const y = e.clientY;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;

            // Clear absolute floating positioning rules entirely
            badge.style.removeProperty('top');
            badge.style.removeProperty('left');
            badge.style.removeProperty('right');
            badge.style.removeProperty('bottom');

            // Define the 3 valid corner coordinate sets (Top Left, Top Right, Bottom Left)
            const corners = [
                { name: 'topLeft',     x: 0,        y: 0 },
                { name: 'topRight',    x: winWidth, y: 0 },
                { name: 'bottomLeft',  x: 0,        y: winHeight }
            ];

            // Calculate Euclidean distance to find the absolute closest available target corner
            let closestCorner = corners[0];
            let minDistance = Infinity;

            for (const corner of corners) {
                const distance = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCorner = corner;
                }
            }

            // Snap the layout elements into the closest chosen position properties
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

        // If it was just a quick tap without drag actions, fire standard scroll navigation execution rules
        executeScrollClickToggle();
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
                badge.style.setProperty('transition', 'none', 'important');
                badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
            }
        }, CONFIG.longPressDelay);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Isolated original navigation block execution processing sequence
    function executeScrollClickToggle() {
        const scroller = getScrollerData();
        const totalScrollable = scroller.height - scroller.client;

        let exactPercent = 0;
        if (totalScrollable > 0) {
            exactPercent = Math.round((scroller.top / totalScrollable) * 100);
        }

        const targetTop = exactPercent === 0 ? scroller.height : 0;

        if (!lastActiveScroller || lastActiveScroller === document.documentElement || lastActiveScroller === document.body) {
            window.scrollTo({ top: targetTop, behavior: 'auto' });
            document.documentElement.scrollTop = targetTop;
            document.body.scrollTop = targetTop;
        }

        if (lastActiveScroller && typeof lastActiveScroller.scrollTo === 'function') {
            lastActiveScroller.scrollTo({ top: targetTop, behavior: 'auto' });
            lastActiveScroller.scrollTop = targetTop;
        }

        updateScrollBadge();
    }

    // Prevent direct standard inline badge click operations from breaking structural timing calculations
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

    // Track when any container is actively scrolled to flip focus targets dynamically
    document.addEventListener('scroll', function(e) {
        const target = e.target === document ? document.documentElement : e.target;

        if (target && target.scrollHeight > target.clientHeight) {
            lastActiveScroller = target;
            updateScrollBadge();
        }
    }, true);

    // Helper function to figure out data calculations
    function getScrollerData() {
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

        if (target === document.documentElement || target === document.body || !target) {
            const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            const winHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const winClient = document.documentElement.clientHeight || window.innerHeight;
            return { top: winScroll, height: winHeight, client: winClient };
        }

        return { top: target.scrollTop, height: target.scrollHeight, client: target.clientHeight };
    }

    // Function to calculate scroll percentage and update badge
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

        if (roundedPercent !== currentPercent) {
            currentPercent = roundedPercent;
            resetFadeTimer();
        }

        const hue = (scrolledPercent / 100) * 360;

        badge.innerText = `${roundedPercent}%`;
        badge.style.setProperty('background-color', `hsl(${hue}, 85%, 45%)`, 'important');
    }

    window.addEventListener('resize', updateScrollBadge);
    setInterval(updateScrollBadge, 300);
    updateScrollBadge();
})();
