// ==UserScript==
// @name         Scroll Percentage Badge
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds a badge in the top right corner showing the current scroll percentage. Click to jump to the top or bottom.
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

        // Styling Details
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        badgePadding: '6px 10px',
        borderRadius: '20px',
        zIndex: '1000000000'
    };
    // =======================================================

    let lastActiveScroller = null;
    let fadeTimeout = null;
    let currentPercent = -1; // Keep track of the last rendered percentage

    // Create the badge element
    const badge = document.createElement('div');
    badge.id = 'tm-scroll-percentage-badge';

    // Style the badge with a clean, flat aesthetic (No shadows)
    badge.style.setProperty('position', 'fixed', 'important');
    badge.style.setProperty('top', '10px', 'important');
    badge.style.setProperty('right', '10px', 'important');
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

        if (!badge.matches(':hover')) {
            badge.style.setProperty('opacity', CONFIG.activeOpacity, 'important');
        }

        fadeTimeout = setTimeout(() => {
            if (!badge.matches(':hover')) {
                badge.style.setProperty('opacity', CONFIG.inactiveOpacity, 'important');
            }
        }, CONFIG.fadeDelay);
    }

    // Click event to toggle teleportation to top or bottom
    badge.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();

        const scroller = getScrollerData();
        const totalScrollable = scroller.height - scroller.client;

        // Calculate the current scroll calculation precisely on click
        let exactPercent = 0;
        if (totalScrollable > 0) {
            exactPercent = Math.round((scroller.top / totalScrollable) * 100);
        }

        // Determine target destination based on whether we are at the top or not
        const targetTop = exactPercent === 0 ? scroller.height : 0;

        // 1. Reset standard window view positions if window is the active layer
        if (!lastActiveScroller || lastActiveScroller === document.documentElement || lastActiveScroller === document.body) {
            window.scrollTo({ top: targetTop, behavior: 'auto' });
            document.documentElement.scrollTop = targetTop;
            document.body.scrollTop = targetTop;
        }

        // 2. Teleport the last known container that was actively scrolled
        if (lastActiveScroller && typeof lastActiveScroller.scrollTo === 'function') {
            lastActiveScroller.scrollTo({ top: targetTop, behavior: 'auto' });
            lastActiveScroller.scrollTop = targetTop;
        }

        // Force an immediate update frame so the badge updates its percentage values instantly
        updateScrollBadge();
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
