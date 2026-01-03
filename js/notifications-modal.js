// Builds and displays the notifications modal with global alerts,
// referral bonuses, and promo banner entries.
function showNotificationModal() {
    const modal = document.getElementById('notificationModal');
    const content = document.getElementById('notificationContent');
    if (!modal || !content) return;

    content.innerHTML = '';

    const refBonus = localStorage.getItem('ref_bonus');
    let hasContent = false;

    // 1. Global Notifications
    if (window.notifications && window.notifications.length > 0) {
        window.notifications.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            // Determine icon
            let icon = '<svg viewBox="0 0 24 24" fill="var(--vk)" width="24" height="24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>';
            if (n.icon === '🎁') icon = '<svg viewBox="0 0 24 24" fill="#FF3347" width="24" height="24"><path d="M20,8h-3.1C16.6,5.6,14.5,4,12,4S7.4,5.6,7.1,8H4c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V10 C22,8.9,21.1,8,20,8z M12,6c1.2,0,2.1,0.9,2.1,2h-4.2C9.9,6.9,10.8,6,12,6z M19,20h-6v-8h6V20z M11,20H5v-8h6V20z"/></svg>';

            item.innerHTML = `
                <div class="notif-icon">${icon}</div>
                <div class="notif-text">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-desc">${n.text}</div>
                </div>
            `;
            content.appendChild(item);
            hasContent = true;
        });
    }

    // 2. Referral Notification
    if (refBonus) {
        const refItem = document.createElement('div');
        refItem.className = 'notification-item ref-item';
        refItem.style.borderLeft = '4px solid var(--vk)';
        refItem.style.zIndex = '100002'; // Explicit higher z-index for item
        refItem.innerHTML = `
            <div class="notif-icon"><svg viewBox="0 0 24 24" fill="#FF3347" width="24" height="24"><path d="M20,8h-3.1C16.6,5.6,14.5,4,12,4S7.4,5.6,7.1,8H4c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V10 C22,8.9,21.1,8,20,8z M12,6c1.2,0,2.1,0.9,2.1,2h-4.2C9.9,6.9,10.8,6,12,6z M19,20h-6v-8h6V20z M11,20H5v-8h6V20z"/></svg></div>
            <div class="notif-text">
                <div class="notif-title">Бонус за приглашение</div>
                <div class="notif-desc">${refBonus}</div>
            </div>
        `;
        // Prepend or Append? User said "ref behind modal...". 
        // Usually recent on top. Let's prepend to make it prominent.
        content.insertBefore(refItem, content.firstChild);
        hasContent = true;
    }

    if (hasContent) {
        modal.style.display = 'flex';
        const badge = document.querySelector('.notification-badge');
        if(badge) badge.style.display = 'none';
    }
}
