// Positions and toggles the verified badge tooltip based on viewport and target element placement.
(function() {
    const getTooltip = () => document.getElementById('verified-tooltip');
    function updatePosition(target) {
        const tooltip = getTooltip();
        if (!tooltip) return;
        tooltip.style.display = 'block'; 
        const rect = target.getBoundingClientRect();
        const tRect = tooltip.getBoundingClientRect();
        const arrow = tooltip.querySelector('div[style*="transform"]');
        const gap = 12;
        let top = rect.bottom + gap;
        let isTop = false;
        if (top + tRect.height > window.innerHeight) { top = rect.top - tRect.height - gap; isTop = true; }
        let left = rect.left + (rect.width / 2) - (tRect.width / 2);
        if (left < 10) left = 10;
        if (left + tRect.width > window.innerWidth - 10) left = window.innerWidth - tRect.width - 10;
        tooltip.style.top = (window.scrollY + top) + 'px';
        tooltip.style.left = left + 'px';
        if (arrow) {
            arrow.style.position = 'absolute';
            arrow.style.left = (rect.left + rect.width/2 - left - 6) + 'px';
            if (isTop) { arrow.style.bottom = '-6px'; arrow.style.top = 'auto'; } else { arrow.style.top = '-6px'; arrow.style.bottom = 'auto'; }
        }
    }
    const observer = new MutationObserver(() => {
        const nameEl = document.querySelector('.profile-name');
        if (nameEl) {
            const svgs = document.querySelectorAll('svg');
            svgs.forEach(svg => {
                if (svg.closest('.btn-profile') || svg.closest('.footer-icon') || svg.closest('.profile-meta')) return;
                if (svg.previousElementSibling && svg.previousElementSibling.classList.contains('profile-name')) {
                    if (svg.dataset.fixed) return;
                    svg.dataset.fixed = 'true';
                    svg.onmouseenter = (e) => updatePosition(e.currentTarget);
                    svg.onmouseleave = () => { const t = getTooltip(); if(t) t.style.display = 'none'; };
                }
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
