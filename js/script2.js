// --- GLOBALS ---
let activeYear = null;
let lastScrollPos = 0;
const REF_TTL = 86400000; 
const REF_KEY = 'refs_v5'; 
const REF_TIME = 'refs_time_v5';

// --- YEAR FILTER LOGIC ---
function renderYears() { renderDateFilters(); }
function filterByYear(year) { setYear(year); }

// --- SCROLL ---
const indicator = document.getElementById('scroll-indicator');
function handleLeftScroll() { if(document.getElementById('modal') && document.getElementById('modal').classList.contains('open')) return;
    const currentY = window.scrollY;
    if (currentY > 100) {
        lastScrollPos = currentY;
        window.scrollTo({ top: 0, behavior: 'auto' });
        if(indicator) indicator.innerText = '↓';
    } else if (lastScrollPos > 0) {
        window.scrollTo({ top: lastScrollPos, behavior: 'auto' });
        lastScrollPos = 0;
        if(indicator) indicator.innerText = '↑';
    }
}
window.addEventListener('scroll', () => {
    if(!indicator) return;
    if(window.scrollY > 100) indicator.innerText = '↑';
    else if (lastScrollPos > 0) indicator.innerText = '↓';
});

// --- SUBSCRIBE ---
function toggleSubscribe(btn) {
    if(!btn.classList.contains('btn-subscribed')) {
        window.open('https://vk.com/dsgnjr', '_blank');
        btn.classList.add('btn-subscribed');
        btn.innerHTML = 'Вы подписаны';
        localStorage.setItem('user_subscribed', 'true');
    } else {
        btn.classList.remove('btn-subscribed');
        btn.innerHTML = 'Подписаться';
        localStorage.removeItem('user_subscribed');
    }
}
window.addEventListener('load', () => {
    if(localStorage.getItem('user_subscribed') === 'true') {
        document.querySelectorAll('.btn').forEach(b => {
            if(b.innerText.includes('Подписаться')) {
                b.classList.add('btn-subscribed');
                b.innerHTML = 'Вы подписаны';
                b.onclick = (e) => { e.preventDefault(); toggleSubscribe(b); };
            }
        });
    } else {
         document.querySelectorAll('.btn').forEach(b => {
            if(b.innerText.includes('Подписаться')) b.onclick = (e) => { e.preventDefault(); toggleSubscribe(b); };
         });
    }
    restoreRefs();
    renderYears(); // Initial render if data exists (might need hook into setPhotos)
});

// --- REFS ---
function updateRefBar() {
    let bar = document.getElementById('ref-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'ref-bar';
        document.body.appendChild(bar);
    }
    const count = selectedRefs.size;
    bar.innerHTML = `
        <div style="font-weight:500; font-size:14px; margin-right:5px;">Выбрано: ${count}</div>
        <button class="ref-btn-icon" onclick="copyRefs()">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg>
             Ссылки
        </button>
        <button class="ref-btn-icon" onclick="downloadRefsArchive()">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
             Архив
        </button>
        <button onclick="clearRefs(); persistRefs();" style="background:none; border:none; color:#aaa; font-size:20px; cursor:pointer; margin-left:5px;">&times;</button>
    `;
    bar.classList.toggle('visible', count > 0);
    persistRefs();
    document.querySelectorAll('.ref-overlay-btn').forEach(b => {
        b.classList.toggle('active', selectedRefs.has(b.dataset.url));
    });
}
function persistRefs() {
    if(selectedRefs.size > 0) {
        localStorage.setItem(REF_KEY, JSON.stringify([...selectedRefs]));
        localStorage.setItem(REF_TIME, Date.now());
    } else {
        localStorage.removeItem(REF_KEY);
        localStorage.removeItem(REF_TIME);
    }
}
function restoreRefs() {
    const saved = localStorage.getItem(REF_KEY);
    const time = localStorage.getItem(REF_TIME);
    if(saved && time && (Date.now() - time < REF_TTL)) {
        JSON.parse(saved).forEach(i => selectedRefs.add(i));
        updateRefBar();
    }
}
function toggleRefBtn(url, btn) {
    if(selectedRefs.has(url)) selectedRefs.delete(url);
    else selectedRefs.add(url);
    updateRefBar();
}
async function downloadRefsArchive() {
    if(selectedRefs.size === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("references");
    const links = [...selectedRefs];
    const btn = document.querySelector('#ref-bar button:nth-child(3)');
    const old = btn.innerHTML;
    btn.innerHTML = '...';
    for(let i=0; i<links.length; i++) {
        try { const blob = await fetch(links[i]).then(r => r.blob()); folder.file(`ref_${i+1}.jpg`, blob); } catch(e) {}
    }
    zip.generateAsync({type:"blob"}).then(c => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(c);
        a.download = "refs.zip";
        a.click();
        btn.innerHTML = old;
        clearRefs();
    });
}

// --- MOBILE ---
document.addEventListener('DOMContentLoaded', () => {
    const i = document.getElementById('menu-icon');
    const n = document.querySelector('.navbar');
    if(i && n) i.onclick = () => n.classList.toggle('active');
    initPortfolioSearch();
    attachDisabledCheckboxGuards();
});
