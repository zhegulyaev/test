// --- v68 FULL LOGIC ---

var activeMonth = null;
var globalReviewsCount = 0;
const MY_OWNER_ID = '163936790'; 
const MY_TOPIC_ID = '37742383';
const monthNamesList = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function attachDisabledCheckboxGuards() {
    document.querySelectorAll('.feature-checkbox:disabled').forEach(input => {
        const label = input.closest('label') || input.closest('.item-left');
        if (!label || label.dataset.guardAttached) return;
        label.dataset.guardAttached = '1';
        label.addEventListener('click', (e) => {
            if (input.disabled && !e.target.closest('.info-icon')) {
                e.preventDefault();
                showToast("Нельзя отключить стандартные элементы тарифа");
            }
        });
    });
}

// 1. CURSOR
(function() {
    const c = document.createElement('div'); c.className = 'custom-cursor';
    const d = document.createElement('div'); d.className = 'custom-cursor-dot';
    document.body.appendChild(c); document.body.appendChild(d);
    window.addEventListener('mousemove', e => {
        c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
        d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
    });
    document.addEventListener('mouseover', e => {
        if(e.target.closest('button') || e.target.closest('a') || e.target.closest('.card') || e.target.closest('.photo-item')) c.classList.add('hover');
    });
    document.addEventListener('mouseout', () => c.classList.remove('hover'));
})();

// 2. FETCH REVIEWS COUNT
function fetchReviewsCount() {
    if(typeof api === 'function') {
        window.handleReviewsCount = function(d) {
            if(d.response && d.response.count) {
                globalReviewsCount = d.response.count;
                if(window.groupInfo) renderGroupHeader(window.groupInfo);
            }
        };
        api('board.getComments', `group_id=${MY_OWNER_ID}&topic_id=${MY_TOPIC_ID}&extended=1&count=0`, 'handleReviewsCount');
    }
}

// 3. OVERRIDE RENDER HEADER
window.renderGroupHeader = function(g) {
    if(!g) return;
    const container = document.getElementById('profile-header');
    const photo = g.photo_200 || 'https://vk.com/images/camera_200.png';
    const name = g.name;
    const members = g.members_count ? g.members_count.toLocaleString('ru-RU') : 0;
    const desc = g.status || g.description || '';

    // BADGE WITH WHITE BG
    // We create a small white circle container, and put the blue badge on top/inside.
    // SVG is 20x20. Circle should be smaller (14x14) behind it? Or same size?
    // User: "podlozku krugluyu... ne budet vyhodit za kraya iconki". 
    // So background must be slightly smaller than the icon (inset).
    const badge = `
    <div style="position:relative; width:20px; height:20px; margin-left:6px; cursor:pointer;" onmouseenter="showTooltip(this)" onmouseleave="hideTooltip()">
        <div style="position:absolute; top:3px; left:3px; width:14px; height:14px; background:white; border-radius:50%;"></div>
        <svg id="verified-icon" width="20" height="20" viewBox="0 0 24 24" fill="#0077FF" style="position:relative; z-index:2;"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.69L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2 3.4-1.47 3.4 1.47 1.89-3.2 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>
    </div>`;

    // RATING STARS (With Count)
    // Count color: Grey (#999)
    const countText = globalReviewsCount > 0 ? `<span style="color:#888; font-weight:400; margin-left:4px;"> · ${globalReviewsCount} отзывов</span>` : '';
    const rating = `
    <div id="header-rating" onclick="openReviewsSection()" style="display:flex; align-items:center; gap:6px; margin-top:8px; margin-bottom:12px; cursor:pointer;">
        <div style="display:flex; gap:2px; color:#FFA000;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </div>
        <div style="font-size:14px;">
            <span style="font-weight:700; color:#fff;">5.0</span>
            ${countText}
        </div>
    </div>`;

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;">
            <a href="https://vk.ru/dsgnjr" target="_blank" class="profile-main-link" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;align-items:center;">
                <img class="profile-avatar" src="${photo}" alt="${name}">
                <div style="display:flex; align-items:center;">
                    <h2 class="profile-name" style="margin:0;">${name}</h2>
                    ${badge}
                </div>
            </a>
            ${rating}
        </div>
        ${desc ? `<p class="profile-desc">${desc}</p>` : ''}
        <a href="https://vk.ru/dsgnjr" target="_blank" class="profile-meta hover-subs" style="text-decoration:none; color:inherit; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            ${members} подписчиков
        </a>
        
<div class="profile-actions">
    <!-- Discuss Project (RED #ff3347) -->
    <a onclick="openOrder()" class="btn-header-primary">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        <span>Обсудить проект</span>
    </a>

    <!-- Subscribe (Gray) -->
    <a href="https://vk.com/dsgnjr" target="_blank" class="btn-secondary-styled">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        <span>Подписаться</span>
    </a>

    <!-- Reviews (Gray, Blue Badge) -->
    <div onclick="openReviewsSection()" class="btn-secondary-styled">
        <div class="review-icon-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <div class="review-badge" id="reviews-badge-count">458</div>
        </div>
        <span>Отзывы</span>
    </div>
</div>

        </div>
    `;
};

window.showTooltip = function(el) {
    const t = document.getElementById('verified-tooltip');
    const rect = el.getBoundingClientRect();
    t.style.display = 'block';
    t.style.top = (rect.top - t.offsetHeight - 10) + 'px';
    t.style.left = (rect.left + rect.width/2 - 20) + 'px'; // Adjusted left for top-left aligned
};
window.hideTooltip = function() {
    document.getElementById('verified-tooltip').style.display = 'none';
};

// 4. OVERRIDE RENDER GRID
window.renderPhotosFromData = function() {
  const r = document.getElementById('area');
  r.innerHTML = '';
  const colCount = (window.innerWidth <= 768) ? 2 : 4; 
  const columns = [];
  r.style.display = 'flex'; r.style.gap = '20px';
  for(let i=0; i<colCount; i++) {
      const col = document.createElement('div');
      col.className = 'masonry-col';
      col.style.flex = '1'; col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '20px';
      r.appendChild(col);
      columns.push(col);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target.querySelector('img');
        if (img && img.dataset.src) {
          img.src = img.dataset.src;
          img.onload = () => img.classList.add('loaded');
          delete img.dataset.src;
        }
        observer.unobserve(entry.target);
      }
    });
  }, {rootMargin: '100px'});

  let filteredPhotos = raw;
  if (searchQuery) { filteredPhotos = filteredPhotos.filter(p => matchesSearch(p, searchQuery)); }
  if (activeTag) { filteredPhotos = filteredPhotos.filter(p => (p.text || '').includes(activeTag)); }
  if (activeYear) {
      filteredPhotos = filteredPhotos.filter(p => p.date && new Date(p.date*1000).getFullYear() === activeYear);
      if (activeMonth !== null) { filteredPhotos = filteredPhotos.filter(p => p.date && new Date(p.date*1000).getMonth() === activeMonth); }
  }

  filteredPhotos.forEach((p, index) => {
    const originalIndex = raw.findIndex(rp => rp.id === p.id);
    const photoObj = photos[originalIndex];
    const ratio = p.height && p.width ? (p.height / p.width * 100) : 100;

    const div = document.createElement('div');
    div.className = 'photo-item';
    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';
    imgContainer.style.paddingTop = ratio + '%';
    imgContainer.style.position = 'relative';

    const img = document.createElement('img');
    img.dataset.src = photoObj.mid; img.alt = '';
    imgContainer.appendChild(img);

    const refBtn = document.createElement('div');
    refBtn.className = 'ref-overlay-btn';
    refBtn.dataset.url = photoObj.full;
    refBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
    if(selectedRefs.has(photoObj.full)) refBtn.classList.add('active');

    refBtn.onclick = (e) => { e.stopPropagation(); toggleRefBtn(photoObj.full, refBtn); };
    imgContainer.appendChild(refBtn);

    div.appendChild(imgContainer);
    div.onclick = () => openAlbumById(alb, index);

    const highlight = getMatchSnippet(p);
    if (highlight) {
        const badge = document.createElement('div');
        badge.className = 'search-highlight';
        badge.innerHTML = highlight;
        div.appendChild(badge);
    }

    let shortestCol = columns[0];
    for(let c of columns) { if(c.offsetHeight < shortestCol.offsetHeight) shortestCol = c; }
    shortestCol.appendChild(div);
    observer.observe(div);
  });

  if(filteredPhotos.length === 0) {
      const reason = searchQuery ? `по запросу «${searchQuery}»` : (activeTag ? 'с таким тегом' : 'в этом альбоме');
      r.innerHTML = `<div class="empty-album">Нет работ ${reason}</div>`;
  }
};

// 5. REST OF LOGIC
function renderDateFilters() {
    const years = new Set();
    raw.forEach(p => {
        if (p.date) {
            const d = new Date(p.date * 1000);
            years.add(d.getFullYear());
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const menu = document.getElementById('years-bar');
    const toggle = document.getElementById('date-toggle');
    if (!menu || !toggle) return;

    if (sortedYears.length < 2) {
        toggle.style.display = 'none';
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        return;
    }

    toggle.style.display = 'inline-flex';
    menu.innerHTML = `<button class="year-chip ${activeYear===null?'active':''}" onclick="setYear(null, true)">Все года</button>`;
    sortedYears.forEach(y => {
        menu.innerHTML += `<button class="year-chip ${activeYear===y?'active':''}" onclick="setYear(${y}, true)">${y}</button>`;
    });
    toggle.textContent = activeYear ? `Дата: ${activeYear}` : 'Дата ▾';
    const isOpen = menu.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function toggleDateDropdown(force) {
    const menu = document.getElementById('years-bar');
    const toggle = document.getElementById('date-toggle');
    if (!menu || !toggle) return;
    const willOpen = force === undefined ? !menu.classList.contains('open') : !!force;
    menu.classList.toggle('open', willOpen);
    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    menu.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    if (willOpen) renderDateFilters();
}

window.setYear = function(y, closeDropdown = false) {
    activeYear = y;
    activeMonth = null;
    if (closeDropdown) toggleDateDropdown(false);
    renderDateFilters();
    renderPhotosFromData();
};
window.setMonth = function(m) { activeMonth = m; renderDateFilters(); renderPhotosFromData(); };
window.renderYears = function() { renderDateFilters(); };

document.addEventListener('click', (e) => {
    if (!e.target.closest('.date-filter')) toggleDateDropdown(false);
});

window.toggleRefBtn = function(url, btn) {
    if(selectedRefs.has(url)) {
        selectedRefs.delete(url);
    } else {
        selectedRefs.add(url);
        if(selectedRefs.size > 3) {
            showToast("Лучше выбрать 2-3 примера, этого достаточно (но можно и больше)");
        }
    }
    updateRefBar();
};

window.updateRefBar = function() {
    let bar = document.getElementById('ref-bar');
    if(!bar) {
        bar = document.createElement('div');
        bar.id = 'ref-bar';
        bar.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(20,20,20,0.9); padding:10px 20px; border-radius:50px; display:flex; gap:15px; align-items:center; z-index:999; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px); transition: transform 0.3s, opacity 0.3s; opacity:0; pointer-events:none; transform:translate(-50%, 20px); box-shadow:0 10px 30px rgba(0,0,0,0.5);";
        bar.innerHTML = `
            <span id="ref-count" style="font-weight:600; color:#fff;">0</span>
            <div style="width:1px; height:20px; background:rgba(255,255,255,0.2);"></div>
            <button onclick="copyRefLinks()" title="Скопировать список" style="background:none; border:none; color:#fff; cursor:pointer; font-family:inherit; font-size:14px; display:flex; align-items:center; gap:6px;">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
               Копия
            </button>
            <button onclick="downloadRefsArchive()" title="Скачать архивом" style="background:none; border:none; color:#fff; cursor:pointer; font-family:inherit; font-size:14px; display:flex; align-items:center; gap:6px;">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
               Архив
            </button>
            <button onclick="clearRefs()" style="background:none; border:none; color:#ff5555; cursor:pointer; margin-left:5px; font-size:18px;">&times;</button>
        `;
        document.body.appendChild(bar);
    }
    const count = selectedRefs.size;
    const txt = bar.querySelector('#ref-count');
    if(txt) txt.innerText = count + (count === 1 ? ' пример' : (count < 5 ? ' примера' : ' примеров'));

    if(count > 0) {
        bar.style.opacity = '1'; bar.style.pointerEvents = 'auto'; bar.style.transform = 'translate(-50%, 0)';
    } else {
        bar.style.opacity = '0'; bar.style.pointerEvents = 'none'; bar.style.transform = 'translate(-50%, 20px)';
    }
    document.querySelectorAll('.ref-overlay-btn').forEach(b => {
        if(selectedRefs.has(b.dataset.url)) b.classList.add('active'); else b.classList.remove('active');
    });
    localStorage.setItem('refs_v5', JSON.stringify([...selectedRefs]));
};

window.copyRefLinks = function() {
    const links = [...selectedRefs];
    const text = "Мне понравились вот эти примеры:\n\n" + links.join('\n');
    navigator.clipboard.writeText(text).then(() => { showToast("Ссылки скопированы!"); }).catch(err => { showToast("Ошибка копирования"); });
};

window.showToast = function(msg) {
    const t = document.getElementById('toast-notification');
    if (!t) return;
    t.innerHTML = `<span>${msg}</span>`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if(selectedRefs.size > 0) {
            selectedRefs.clear(); updateRefBar(); showToast("Выбор отменен");
        }
    }
});
window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    const bar = document.getElementById('header-progress');
    if(bar) bar.style.width = scrollPercent + '%';
});
window.addEventListener('load', () => { 
    window.dispatchEvent(new Event('scroll')); 
    setTimeout(fetchReviewsCount, 1000); 
});

window.toggleSubscribeBtn = function(btn) {
    if(btn.classList.contains('subscribed')) return;
    btn.style.opacity = '0.7';
    setTimeout(() => {
        btn.classList.add('subscribed');
        btn.style.opacity = '1';
        btn.querySelector('span').innerText = 'Подписаны';
        btn.querySelector('svg').innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
    }, 600);
};
