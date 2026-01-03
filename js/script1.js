let scrollBeforeModal = 0;
const TOKEN = 'vk1.a.RMLdkgtqMrzlMwcs19POQ9F1OBSGNYwgxzPbh6MYmM56hmPwX65syhrqyAYNl7jXHuo-2oqpyGbCApRNVrK_ysiLlCFohaeBoDgK5F5-jygSwPOThzU0BayxCSqOgYGEBa3GV6NgWEHA-CP8Esl1W1qi6YaL7-mfr3ID3s7NOT_ilv6UNTRm6LPFJCb2WfeNG0tZCCtodrExiFk4JosIAw';
const OWNER = '-163936790';
const REVIEW_TOPIC_ID = '37742383';
const TARIFF_STATE_KEY = 'tariff_config_v1';
const TARIFF_CONFIG_PARAM = 'config';

let photos = [], raw = [], idx = 0, hist = [], covers = {}, alb = null, rev = 0, revReviews = 0, albumCounts = {}, groupInfo = null, currentMenu = [], totalWorks = 0; let selectedRefs = new Set(); let lastOrderText = '', lastOrderTotal = '—'; let orderCleared = false;
const ORDER_HINT_TEXT = 'Напишите мне в удобной соцсети — отвечу быстро, помогу подобрать наполнение и предложу бонусы за оперативность.';
let reviewsLoaded = 0, reviewsTotal = 0, reviewsWrap = null, reviewsLoading = false, reviewsProfiles = [], reviewsGroups = [], reviewsObserver = null, reviewsSentinel = null, reviewsSortOrder = 'desc';
let services = [], currentServiceId = null;
let currentFolderId = null;
let currentSection = 'main';
let tariffDefaults = null;
let restoringTariffs = false;
const SEARCH_KEY = 'portfolio_search_query_v1';
let searchQuery = '';
let searchInput = null;
let searchClearBtn = null;

const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyReducedMotionPreference(event) {
    document.body.classList.toggle('reduced-motion', !!event.matches);
}

applyReducedMotionPreference(prefersReducedMotion);
prefersReducedMotion.addEventListener('change', applyReducedMotionPreference);

function isReducedMotion() {
    return document.body.classList.contains('reduced-motion');
}

window.addEventListener('mousemove', (e) => {
    if (isReducedMotion()) return;
    const posX = e.clientX;
    const posY = e.clientY;
    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;
});
document.addEventListener('mouseover', (e) => {
    if (isReducedMotion()) {
        cursorOutline.classList.remove('hovered');
        return;
    }
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.card') || e.target.closest('.photo-item') || e.target.closest('.cursor-pointer')) {
        cursorOutline.classList.add('hovered');
    } else {
        cursorOutline.classList.remove('hovered');
    }
});

function debounce(fn, delay = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function escapeRegExp(text) {
  return (text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchField(p) {
  const tags = ((p.text || '').match(/#[\p{L}\d_]+/gu) || []).join(' ');
  const albumTitle = p.albumTitle || '';
  return `${albumTitle} ${p.text || ''} ${tags}`.toLowerCase();
}

function matchesSearch(p, query) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  if (!p.searchField) p.searchField = buildSearchField(p);
  const pattern = new RegExp(`(^|[^\\p{L}\\d])${escapeRegExp(normalized)}([^\\p{L}\\d]|$)`, 'iu');
  return pattern.test(p.searchField);
}

function getMatchSnippet(p) {
  if (!searchQuery) return '';
  const source = `${p.albumTitle || ''} ${p.text || ''}`.trim();
  if (!source) return '';
  const normalized = searchQuery.toLowerCase();
  const lower = source.toLowerCase();
  const pattern = new RegExp(`(^|[^\\p{L}\\d])${escapeRegExp(normalized)}([^\\p{L}\\d]|$)`, 'iu');
  const match = lower.match(pattern);
  if (!match) return '';
  const matchIndex = (match.index || 0) + (match[1] ? match[1].length : 0);
  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(source.length, matchIndex + normalized.length + 30);
  const snippet = source.slice(start, end);
  const clippedStart = start > 0;
  const clippedEnd = end < source.length;
  const safeSnippet = snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safe = `${clippedStart ? '…' : ''}${safeSnippet}${clippedEnd ? '…' : ''}`;
  const reg = new RegExp(`(^|[^\\p{L}\\d])(${escapeRegExp(searchQuery)})($|[^\\p{L}\\d])`, 'giu');
  return safe.replace(reg, (_, p1, p2, p3) => `${p1}<mark>${p2}</mark>${p3}`);
}

function persistSearchQuery() {
  try { localStorage.removeItem(SEARCH_KEY); } catch(e) {}
}

function restoreSearchQuery() {
  try {
    const saved = localStorage.getItem(SEARCH_KEY);
    if (saved) localStorage.removeItem(SEARCH_KEY);
  } catch(e) {}
  return '';
}

function toggleSearchBar(visible) {
  const bar = document.getElementById('portfolio-search-bar');
  if (!bar) return;
  bar.classList.toggle('visible', !!visible);
  bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (searchInput) searchInput.disabled = !visible;
}

function updateSearchClearVisibility() {
  if (!searchClearBtn || !searchInput) return;
  const hasText = !!searchInput.value.trim();
  searchClearBtn.classList.toggle('visible', hasText);
}

function handleSearchChange(value) {
  searchQuery = value.trim();
  persistSearchQuery(searchQuery);
  updateSearchClearVisibility();
  if (alb) renderPhotosFromData();
}

function initPortfolioSearch() {
  searchInput = document.getElementById('portfolio-search');
  searchClearBtn = document.getElementById('search-clear');
  if (!searchInput) return;
  restoreSearchQuery();
  searchQuery = '';
  searchInput.value = '';
  const debounced = debounce(v => handleSearchChange(v), 250);
  searchInput.addEventListener('input', (e) => debounced(e.target.value));
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearPortfolioSearch(); });
  updateSearchClearVisibility();
}

function clearPortfolioSearch() {
  if (searchInput) searchInput.value = '';
  handleSearchChange('');
}

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || 'tariff';
}

function api(m,p,cb){
  const s=document.createElement('script');
  s.src=`https://api.vk.com/method/${m}?${p}&access_token=${TOKEN}&v=5.131&callback=${cb}`;
  document.head.appendChild(s);
  s.onload=()=>s.remove();
}

function getUrlParams() {
  const params = new URLSearchParams(location.search);
  return {
    album: params.get('album'),
    photo: params.get('photo') ? parseInt(params.get('photo')) - 1 : null,
    service: params.get('service'),
    folder: params.get('folder'),
    section: params.get('section'),
    config: params.get(TARIFF_CONFIG_PARAM)
  };
}

function applyStateFromUrl() {
  const {album, photo, service, folder, section} = getUrlParams();
  hist = [];
  currentSection = 'main';

  if (section === 'reviews') { openReviewsSection(true); return; }
  if (section === 'services') { loadServices(true); return; }

  menuShow(menu, "ПОРТФОЛИО");
  if (folder) openFolderById(folder);
  if (album) openAlbumById(album, photo);
  if (service) openService(service);
}


function updateUrl(albumId = null, photoIndex = null, serviceId = null, folderId = null, section = null) {
  const params = new URLSearchParams();
  if (albumId) params.set('album', albumId);
  if (photoIndex !== null && photoIndex >= 0) params.set('photo', photoIndex + 1);
  if (serviceId) params.set('service', serviceId);
  if (folderId) params.set('folder', folderId);
  if (section) params.set('section', section);
  const queryString = params.toString() ? '?' + params.toString() : '';
  const newUrl = queryString || location.pathname;
  const currentSearch = location.search;
  if (currentSearch === queryString) {
      history.replaceState(null, '', newUrl + location.hash);
      return;
  }
  if (photoIndex !== null) {
      history.replaceState(null, '', newUrl + location.hash);
  } else {
      history.pushState(null, '', newUrl + location.hash);
  }
}
window.addEventListener('popstate', () => { applyStateFromUrl(); });


function startBackgroundPreload() {
    if(!photos || photos.length === 0) return;
    let loadedCount = 0;
    const preloadStep = (index) => {
        if(index >= photos.length) return;
        const p1 = photos[index];
        const p2 = photos[index+1];
        const loadImg = (url) => { if(!url) return; const i = new Image(); i.src = url; };
        if(p1) loadImg(p1.mid);
        if(p2) loadImg(p2.mid);
        setTimeout(() => preloadStep(index + 2), 200);
    };
    setTimeout(() => preloadStep(0), 1000);
}

window.addEventListener('scroll', () => {
    // Progress Bar Logic
    const bar = document.getElementById('header-progress');
    if (isReducedMotion()) {
        if (bar) bar.style.opacity = 0;
        return;
    }
    if (alb && bar) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = scrollPercent + '%';
    }

    const btn = document.getElementById('scroll-top');
    if (window.scrollY > 500) {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
    }
});

function renderGroupHeader(g) {
    if(!g) return;
    const container = document.getElementById('profile-header');
    const photo = g.photo_200 || 'https://vk.com/images/camera_200.png';
    const name = g.name;
    const members = g.members_count ? g.members_count.toLocaleString('ru-RU') : 0;
    const desc = g.status || g.description || '';
    
    container.innerHTML = `
        <a href="https://vk.ru/dsgnjr" target="_blank" class="profile-main-link" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;align-items:center;">
            <img class="profile-avatar" src="${photo}" alt="${name}">
            <h2 class="profile-name">${name}</h2>
        </a>
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
}

window.setGroup = d => { 
    if(d.response) {
        groupInfo = d.response[0];
        renderGroupHeader(groupInfo);
    updateFooterMembers();

        const avatarUrl = groupInfo.photo_200 || groupInfo.photo_100 || groupInfo.photo_50 || 'https://vk.com/images/camera_200.png';
        document.getElementById('bubble-avatar').src = avatarUrl;
        document.getElementById('header-avatar').src = avatarUrl;
        updateOrderHintAvatar();
    }
};
api('groups.getById', `group_id=dsgnjr&fields=members_count,photo_200,photo_100,photo_50,description,status`, 'setGroup');

window.saveCovers = d => {
  if(d.response){
    d.response.items.forEach(a=>{
      const sizes = a.sizes || [];
      const best = sizes.length ? sizes.sort((x,y) => y.width - x.width)[0] : null;
      covers[a.id] = best ? best.url : (a.thumb_src || '');
      albumCounts[a.id] = a.size || 0;
      if (a.id !== -211 && a.id !== -212) { totalWorks += a.size || 0; }
    });
    api('execute', 'code=' + encodeURIComponent('var o=Args.owner_id; return [API.photos.get({"owner_id":o,"album_id":270856221,"count":7}),API.photos.get({"owner_id":o,"album_id":269040903,"offset":6,"count":1}),API.photos.get({"owner_id":o,"album_id":309328278,"offset":69,"count":1}),API.photos.get({"owner_id":o,"album_id":279127223,"offset":0,"count":1}),API.photos.get({"owner_id":o,"album_id":284187693,"offset":2,"count":1}),API.photos.get({"owner_id":o,"album_id":264642934,"offset":14,"count":1}),API.photos.get({"owner_id":o,"album_id":269062586,"offset":12,"count":1}),API.photos.get({"owner_id":o,"album_id":278088695,"offset":2,"count":1}),API.photos.get({"owner_id":o,"album_id":282455381,"offset":24,"count":1})];') + '&owner_id=' + OWNER, 'saveCustomCovers');
    api('board.getTopics', `group_id=${Math.abs(OWNER)}&topic_ids=${REVIEW_TOPIC_ID}&preview=1`, 'saveReviewsCount');
  }
};


window.saveCustomCovers = d => {
  if(d.response){
     const [social, banners, posters, music, wb, insta, yt, preview, avatars] = d.response;
     const getUrl = (list, idx) => {
         if(!list || !list.items) return '';
         const item = list.items[idx] || list.items[0]; 
         if(!item) return '';
         const s = item.sizes.find(x => x.type === 'x') || item.sizes.find(x => x.type === 'y') || item.sizes.find(x => x.type === 'z') || item.sizes.find(x => x.type === 'w') || item.sizes.sort((a,b)=>(b.width||0)-(a.width||0))[0];
         return s ? s.url : '';
     };
     covers['270856221'] = getUrl(social, 0); covers['folder_social'] = getUrl(social, 6); covers['269040903'] = getUrl(banners, 0); covers['309328278'] = getUrl(posters, 0); covers['279127223'] = getUrl(music, 0); covers['284187693'] = getUrl(wb, 0); covers['264642934'] = getUrl(insta, 0); covers['269062586'] = getUrl(yt, 0); covers['278088695'] = getUrl(preview, 0); covers['282455381'] = getUrl(avatars, 0);
     if(typeof currentMenu !== 'undefined') menuShow(currentMenu, document.getElementById('title').innerText);
  }
};
window.saveReviewsCount = d => {
    if(d.response && d.response.items && d.response.items.length > 0) {
        albumCounts['reviews'] = d.response.items[0].comments;
    }
    document.getElementById('subtitle').innerText = `· ${totalWorks} работ${totalWorks % 10 === 1 && totalWorks % 100 !== 11 ? 'а' : 'ы'}`;
    applyStateFromUrl();
};

const menu=[
  {title:"Оформление соцсетей",isFolder:true,id:"folder_social",items:[
    {title:"Оформление сообществ",id:"270856221"},
    {title:"Оформление INSTA/TG",id:"264642934"},
    {title:"Оформление YouTube",id:"269062586"},
    {title:"Превью",id:"278088695"},
    {title:"Аватарки для соцсетей",id:"282455381"}
  ]},
  {title:"Рекламные баннеры",id:"269040903"},
  {title:"Постеры",id:"309328278"},
  {title:"Дизайн Wildberries",id:"284187693"},
  {title:"Музыкальные обложки",id:"279127223"},
  {title:"Отзывы клиентов",id:"reviews_link", special: true},
  {title:"Клиенты", id:"services_link", type: "clients", special: true}
];

function findMenuItem(list, targetId, path = []) {
  for (const item of list) {
    if (item.isFolder) {
      const found = findMenuItem(item.items, targetId, [...path, item]);
      if (found) return found;
    } else if (item.id === targetId) {
      return {item, path};
    }
  }
  return null;
}

function openFolderById(folderId) {
  const found = findMenuItem(menu, folderId);
  if (!found) return;

  hist = [];
  let currentList = menu;
  let currentTitle = "ПОРТФОЛИО";

  for (const folder of found.path) {
    hist.push({l: currentList, t: currentTitle, b: true});
    currentList = folder.items;
    currentTitle = folder.title;
    menuShow(currentList, currentTitle, true);
  }
}

function openAlbumById(id, photoIdx = null) {
  const found = findMenuItem(menu, id);
  if (!found) return;

  hist = [];
  let currentList = menu;
  let currentTitle = "ПОРТФОЛИО";

  if (found.path) {
    for (const folder of found.path) {
      hist.push({l: currentList, t: currentTitle, b: true});
      currentList = folder.items;
      currentTitle = folder.title;
      menuShow(currentList, currentTitle, true);
    }
  }

  hist.push({l: currentList, t: currentTitle, b: true});
  loadAlb(id, found.item.title);

  if (photoIdx !== null && photoIdx >= 0) {
    const check = setInterval(() => {
      if (raw.length > 0) {
        clearInterval(check);
        if (photoIdx < raw.length) openModal(photoIdx);
      }
    }, 200);
  }
}

function openReviewsSection(skipUrlUpdate = false) {
    currentSection = 'reviews';
    switchTab('portfolio');
    if (!skipUrlUpdate) hist.push({l: currentMenu, t: document.getElementById('title').innerText, b: true});
    if (!skipUrlUpdate) updateUrl(null, null, null, null, 'reviews');
    toggleSearchBar(false);
    loadReviews();
}

function loadServices(skipUrlUpdate = false) { window.scrollTo(0,0); document.getElementById("header-progress").style.opacity = 0;
    currentSection = 'services';
    if (!skipUrlUpdate) updateUrl(null, null, null, null, 'services');
    alb = null;
    currentServiceId = null;
    currentFolderId = null;
    const r = document.getElementById('area');
    r.innerHTML = '<div class="comments-loader" style="padding: 100px; text-align: center;"><svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#888" stroke-width="5" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg></div>';
    
    document.getElementById('title').innerText = "УСЛУГИ";
    document.getElementById('title').dataset.original = "УСЛУГИ";
    document.getElementById('subtitle').innerText = "";
    document.getElementById('back').classList.add('active');
    document.getElementById('sort').classList.remove('active');
    document.getElementById('tags-bar').style.display = 'none';
    toggleSearchBar(false);

    api('market.get', `owner_id=${OWNER}&count=200&extended=1`, 'renderServicesList');
}

window.renderServicesList = d => {
  const r = document.getElementById('area');
  r.innerHTML = '';
  r.className = 'grid';

  // 1. Handle Access Denied (Token/Settings issue)
  if (d.error) {
       console.error('VK API Error:', d.error);
       r.innerHTML = `<div class="empty-album" style="max-width:550px; margin: 50px auto; padding: 0 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
        <h3 style="margin-bottom:10px; color:#fff;">Ошибка доступа к Услугам</h3>
        <p style="color:#aaa; font-size:15px; line-height:1.6;">
            VK API вернул ошибку: <b>Access denied</b> (код 15).<br><br>
            <b>Важный момент:</b><br>
            В VK API разделы «Услуги» и «Товары» работают через одну систему.
            Даже если вы используете только Услуги, для работы API <b>необходимо</b>, чтобы в настройках сообщества был включен раздел <b>«Товары»</b> (Market), либо токен имел права <b>market</b>.<br><br>
            <b>Что сделать:</b><br>
            1. Зайдите в <i>Управление → Разделы</i> и проверьте, что галочка «Товары» включена (или переключите тип раздела).<br>
            2. Если используете токен — перевыпустите его с правами <b>market</b>.
        </p>
      </div>`;
      return;
  }

  if(!d.response || d.response.items.length === 0) {
       r.innerHTML = '<div class="empty-album">Услуг пока нет</div>';
       return;
  }

  
  // Filter: Keep only items with "по договорённости" (agreement) or price = 0
  // This helps distinguish Services from cheap Products (like 1 rub items)
  const allItems = d.response.items;
  const serviceItems = allItems.filter(i => (i.price && (i.price.text.toLowerCase().includes('договор') || i.price.amount === 0)));

  // Use filtered list if not empty, otherwise fallback to all
  services = serviceItems.length > 0 ? serviceItems : allItems;


  document.getElementById('title').innerText = `УСЛУГИ · ${services.length}`;

  services.forEach(item => {
    const thumb = item.thumb_photo || 'https://vk.com/images/camera_200.png';
    const card = document.createElement('div');
    card.className = 'market-card';
    card.innerHTML = `
        <img src="${thumb}" class="market-img" alt="${item.title}">
        <div class="market-content">
            <div class="market-title">${item.title}</div>
            <div class="market-price">${item.price.text}</div>
            <div class="market-btn">Подробнее</div>
        </div>
    `;
    card.onclick = () => openService(item.id);
    r.appendChild(card);
  });
};

function openService(serviceId) { window.scrollTo(0,0); document.getElementById("header-progress").style.opacity = 0;
  const service = services.find(s => s.id === serviceId);
  if (!service) return;

  currentServiceId = serviceId;
  updateUrl(null, null, serviceId);

  hist.push({l: currentMenu, t: document.getElementById('title').innerText, b: true});

  const r = document.getElementById('area');
  r.innerHTML = '';
  r.className = 'grid';

  document.getElementById('title').innerText = service.title;
  document.getElementById('title').dataset.original = service.title;
  document.getElementById('back').classList.add('active');

  const thumb = service.thumb_photo || 'https://vk.com/images/camera_200.png';

  const card = document.createElement('div');
  card.className = 'market-card';
  card.style.maxWidth = '500px';
  card.style.margin = '0 auto';
  card.innerHTML = `
      <img src="${thumb}" class="market-img" alt="${service.title}">
      <div class="market-content">
          <div class="market-title">${service.title}</div>
          <div class="market-price">${service.price.text}</div>
          <div style="margin-bottom: 20px; color: #d1d1d6; white-space: pre-wrap; font-size: 14px;">${service.description || 'Нет описания'}</div>
          <div class="market-btn" onclick="window.open('https://vk.com/im?sel=${OWNER}&message=Здравствуйте! Хочу заказать: ${encodeURIComponent(service.title)}', '_blank')">Заказать</div>
      </div>
  `;
  r.appendChild(card);
}

function resetReviewsState() {
    reviewsLoaded = 0;
    reviewsTotal = 0;
    reviewsProfiles = [];
    reviewsGroups = [];
    reviewsWrap = null;
    reviewsSentinel = null;
    reviewsLoading = false;
    reviewsSortOrder = revReviews === 0 ? 'desc' : 'asc';
    if (reviewsObserver) { reviewsObserver.disconnect(); reviewsObserver = null; }
}

function requestMoreReviews() {
    if (reviewsLoading) return;
    if (reviewsTotal && reviewsLoaded >= reviewsTotal) return;
    reviewsLoading = true;
    api('board.getComments', `group_id=${Math.abs(OWNER)}&topic_id=${REVIEW_TOPIC_ID}&extended=1&sort=${reviewsSortOrder}&count=20&offset=${reviewsLoaded}`, 'renderReviews');
}

function loadReviews() { window.scrollTo(0,0); document.getElementById("header-progress").style.opacity = 0;
    resetReviewsState();
    alb = null;
    const r = document.getElementById('area');
    r.innerHTML = '';
    r.className = '';

    document.getElementById('title').innerText = "ОТЗЫВЫ";
    document.getElementById('title').dataset.original = "ОТЗЫВЫ";
    document.getElementById('subtitle').innerText = "";
    document.getElementById('back').classList.add('active');
    document.getElementById('tags-bar').style.display = 'none';

    document.getElementById('sort').classList.add('active');
    document.getElementById('sort').classList.toggle('active', revReviews === 1);
    document.getElementById('sort').title = revReviews === 0 ? "Сначала новые" : "Сначала старые";

    const videoSection = document.createElement('div');
    videoSection.id = 'vkvideo-section';
    videoSection.style.maxWidth = '1440px';
    videoSection.style.margin = '0 auto 32px auto';
    videoSection.style.padding = '0 20px 8px 20px';
    videoSection.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap: 16px; flex-wrap: wrap; margin-top: 40px; margin-bottom: 18px;">
        <h3 style="font-size: 22px; font-weight: 800; margin: 0; color: #fff;">Видеоотзывы</h3>
        <a href="https://vkvideo.ru/@dsgnjr" target="_blank" rel="noopener" style="text-decoration:none; color: #0077FF; font-weight: 500; font-size: 15px; margin-left: 12px;">Показать все</a>
      </div>
      <div class="vkvideo-grid">
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239087&hash=7eac5b11bacb4c63&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239072&hash=f516e69802be7f48&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239128&hash=11744cfc1023d4b4&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239127&hash=ec339c4e38aa37ac&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239114&hash=782d00be1546dcf9&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239102&hash=e3269a09a1e824a9&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <div class="vkvideo-embed">
            <iframe src="https://vkvideo.ru/video_ext.php?oid=-163936790&id=456239107&hash=dccb24e21f730322&hd=3" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="vkvideo-item">
          <a class="vkvideo-placeholder" href="https://vkvideo.ru/@dsgnjr" target="_blank" rel="noopener">
            <div class="vkvideo-placeholder-inner">
              <div class="vkvideo-placeholder-title">Добавить 8-е видео</div>
              <div class="vkvideo-placeholder-sub">Пришли ссылку video_ext.php</div>
            </div>
          </a>
        </div>
      </div>`;
    r.appendChild(videoSection);

    const textReviewsHeader = document.createElement('div');
    textReviewsHeader.className = 'reviews-header';
    textReviewsHeader.innerHTML = '<h3>Отзывы</h3>';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'reviews-toggle';
    toggleBtn.textContent = revReviews === 0 ? 'Показать старые' : 'Показать новые';
    toggleBtn.onclick = (e) => { e.stopPropagation(); revReviews = revReviews === 1 ? 0 : 1; loadReviews(); };
    textReviewsHeader.appendChild(toggleBtn);
    r.appendChild(textReviewsHeader);

    reviewsWrap = document.createElement('div');
    reviewsWrap.className = 'reviews-grid';
    r.appendChild(reviewsWrap);

    reviewsSentinel = document.createElement('div');
    reviewsSentinel.className = 'comments-loader';
    reviewsSentinel.innerHTML = '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#888" stroke-width="5" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg>';
    r.appendChild(reviewsSentinel);

    reviewsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) requestMoreReviews();
        });
    }, { rootMargin: '300px' });
    reviewsObserver.observe(reviewsSentinel);

    requestMoreReviews();
}

function openReviewPhoto(url) {
    const modal = document.getElementById('review-photo-modal');
    const img = document.getElementById('review-photo-modal-img');
    if (!modal || !img) return;
    img.src = url;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeReviewPhoto() {
    const modal = document.getElementById('review-photo-modal');
    const img = document.getElementById('review-photo-modal-img');
    if (!modal || !img) return;
    modal.classList.remove('open');
    img.src = '';
    document.body.style.overflow = '';
}

window.renderReviews = d => {
    reviewsLoading = false;
    const r = document.getElementById('area');
    const ownerId = parseInt(OWNER, 10);
    const items = (d.response?.items || []).filter(c => c.from_id !== ownerId);

    if(!d.response || (items.length === 0 && reviewsLoaded === 0)) {
         r.innerHTML = '<div class="empty-album">Отзывов пока нет</div>';
         if (reviewsObserver) reviewsObserver.disconnect();
         return;
    }

    if (!reviewsWrap) return;

    const mergeById = (arr, incoming) => {
        const map = new Map(arr.map(i => [i.id, i]));
        (incoming || []).forEach(i => map.set(i.id, i));
        return Array.from(map.values());
    };

    reviewsProfiles = mergeById(reviewsProfiles, d.response.profiles || []);
    reviewsGroups = mergeById(reviewsGroups, d.response.groups || []);
    reviewsTotal = reviewsTotal || d.response.count || items.length;

    items.forEach((c) => {
        let user;
        if (c.from_id > 0) user = reviewsProfiles.find(u => u.id === c.from_id);
        else user = reviewsGroups.find(g => g.id === -c.from_id);

        const photo = user?.photo_100 || 'https://vk.com/images/camera_100.png';
        const name = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.name || 'Пользователь');

        let attachHTML = '';
        if(c.attachments) {
            const photos = c.attachments.filter(a => a.type === 'photo');
            if(photos.length > 0) {
                attachHTML = '<div class="comment-attachments">';
                photos.forEach(ph => {
                     const size = ph.photo.sizes.sort((a,b) => b.width - a.width)[0];
                     const small = ph.photo.sizes.find(s => s.type === 'q') || size;
                     attachHTML += `<img src="${small.url}" class="comment-attach-img" onclick="event.stopPropagation(); openReviewPhoto('${size.url}')">`;
                });
                attachHTML += '</div>';
            }
        }

        const vkLink = `https://vk.com/topic${OWNER}_${REVIEW_TOPIC_ID}?post=${c.id}`;

        const card = document.createElement('div');
        card.className = 'review-card';
        card.onclick = () => window.open(vkLink, '_blank');
        card.innerHTML = `
            <img class="review-avatar" src="${photo}">
            <div class="review-content">
                <div class="review-header">
                    <span class="review-name">${name}</span>
                    <span class="review-date">${new Date(c.date*1000).toLocaleDateString('ru-RU')}</span>
                </div>
                <div class="review-text">${c.text}</div>
                ${attachHTML}
            </div>
        `;

        reviewsWrap.appendChild(card);
    });

    reviewsLoaded += items.length;
    document.getElementById('title').innerText = `ОТЗЫВЫ · ${reviewsTotal || reviewsLoaded}`;

    if (reviewsTotal && reviewsLoaded >= reviewsTotal) {
        if (reviewsObserver) reviewsObserver.disconnect();
        if (reviewsSentinel) reviewsSentinel.style.display = 'none';
    }
};

function menuShow(l,t,b=false){ document.getElementById("header-progress").style.opacity = 0;
  l.sort((a, b) => {
      const getCount = (item) => {
          if (item.special) return -1;
          let c = 0;
          if (item.isFolder) {
             item.items.forEach(sub => c += (albumCounts[sub.id] || 0));
          } else {
             c = albumCounts[item.id] || 0;
          }
          return c;
      };
      return getCount(b) - getCount(a);
  });

  currentMenu = l;
  alb = null; 
  currentServiceId = null;
  currentFolderId = null;
  currentSection = 'main';
  const r=document.getElementById('area');
  r.innerHTML=''; 
  r.className='grid';
  document.getElementById('title').innerText=t;
  document.getElementById('title').dataset.original = t;
  document.getElementById('subtitle').innerText = b ? '' : `· ${totalWorks} работ${totalWorks % 10 === 1 && totalWorks % 100 !== 11 ? 'а' : 'ы'}`;
  document.getElementById('back').classList.toggle('active',b);
  document.getElementById('tags-bar').style.display = 'none';
  toggleSearchBar(false);
  
  document.getElementById('sort').classList.add('active');
  document.getElementById('sort').classList.toggle('active', rev === 0);

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
  }, {rootMargin: '200px'});

  l.forEach(i=>{
    if(i.special) {
        const c=document.createElement('div');
        c.className='card';
        
        
        if (i.type === 'services' || i.type === 'clients') {
             c.className = 'clients-full-width';
             c.style.gridColumn = '1 / -1';
             c.style.width = '100%';
             c.style.cursor = 'default';
             c.style.background = 'transparent';
             c.style.border = 'none';
             c.style.boxShadow = 'none';
             c.innerHTML=`
              <div class="clients-container">
                <div class="clients-header">
                    <svg class="blue-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    Среди <span class="marker-underline-wrapper">моих клиентов<svg class="marker-underline-svg" viewBox="0 0 200 15" preserveAspectRatio="none"><path class="marker-path" d="M5,12 C50,14 100,12 195,5" /></svg></span>
<div class="info-icon-wrapper">
  <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
  <div class="info-tooltip">Проекты, над которыми я работал.<br>Нажмите, чтобы открыть кейс.</div>
</div>

                </div>

                <div class="clients-grid">
                    <div class="client-column">
                        <div class="col-title">Компании</div>
                        <div class="tags-wrap">
                            <div class="client-tag blue"><span>Kaino</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Good Label</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Призыва.Нет</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Суши Мама</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Wikkeo</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>СитиПроф</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>D.Roll</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Chop-Chop</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Метар</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Black Witer</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>AIRYBEATS</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Сочи ЮДВ</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Space Base</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Академия Excel</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Greefon</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Сытофф</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Duck Will</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Cóho</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Звездный</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Exort</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Друг Кузя</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>и другие</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
                        </div>
                    </div>

                    <div class="client-column">
                        <div class="col-title">Личности</div>
                        <div class="tags-wrap">
                            <div class="client-tag blue"><span>Дмитрий Ладесов</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Александр Иванищев</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Ирина Старкова</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Ника Зебра</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>SHKRED</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Евгений Жамкачиев</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Антон Дейнеко</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>Олеся Новикова</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag blue"><span>Анна Вар</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="client-tag"><span>и другие</span><svg class="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
                        </div>
                    </div>
                </div>
              </div>`;
             c.onclick = null;
        }
 else {
            c.innerHTML=`
              <div class="card-img" style="background:#2a2a2c;">
                 <div class="card-icon-center">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                 </div>
              </div>
              <div class="card-info">
                <div class="card-title">${i.title}</div>
                <div class="card-count">${albumCounts['reviews'] || 0}</div>
              </div>`;
            c.onclick=()=> openReviewsSection();
        }
        r.appendChild(c);
        return;
    }

    let count = 0;
    let albumId = i.id;
    if (i.isFolder) {
        albumId = i.items[0].id;
        i.items.forEach(sub => count += (albumCounts[sub.id] || 0));
    } else {
        count = albumCounts[i.id] || 0;
    }
    const coverUrl = covers[i.id] || covers[albumId] || '';
    const c=document.createElement('div');
    c.className='card';
    c.innerHTML=`
      <div class="card-img">
        <img data-src="${coverUrl}" alt="">
      </div>
      <div class="card-info">
        <div class="card-title">${i.title}</div>
        <div class="card-count">${count}</div>
      </div>`;
    c.onclick=()=>{
      if(i.isFolder){ 
        hist.push({l: currentMenu, t, b}); 
        currentFolderId = i.id;
        updateUrl(null, null, null, i.id);
        menuShow(i.items,i.title,true); 
      } else { 
        hist.push({l: currentMenu, t, b}); 
        loadAlb(i.id,i.title); 
      }
    };
    r.appendChild(c);
    observer.observe(c.querySelector('.card-img'));
  });
}

function toggleChronological() {
  const currentTitle = document.getElementById('title').dataset.original;
  
  if (currentTitle === "ОТЗЫВЫ") {
      revReviews = revReviews === 1 ? 0 : 1;
      loadReviews();
      return;
  }
  if (currentTitle === "УСЛУГИ") return;

  if(!alb) return; 
  rev = rev === 1 ? 0 : 1;
  document.getElementById('sort').classList.toggle('active', rev === 0);
  
  loadAlb(alb, currentTitle || "Альбом");
}

function loadAlb(id,t){ window.scrollTo(0,0); document.getElementById("header-progress").style.opacity = 1;
  alb=id; 
  currentServiceId = null;
  updateUrl(id);
  const r=document.getElementById('area');
  r.innerHTML='';
  r.className='masonry-wrap';
  document.getElementById('title').innerText=t;
  document.getElementById('title').dataset.original = t; 
  document.getElementById('subtitle').innerText = '';
  document.getElementById('back').classList.add('active');
  document.getElementById('sort').classList.add('active');
  document.getElementById('sort').classList.toggle('active', rev === 0);
  document.getElementById('sort').title = "Сменить порядок";

  document.getElementById('tags-bar').style.display = 'none';
  activeTag = null; activeYear = null;
  toggleSearchBar(true);
  if (searchInput) searchInput.value = searchQuery;

  const colCount = getColCount();
  for(let i=0; i<colCount; i++){
    const col = document.createElement('div');
    col.className = 'placeholder-col';
    col.style.flex = 1;
    r.appendChild(col);
  }
  
  const placeholders = r.querySelectorAll('.placeholder-col');
  for(let i=0; i<12; i++){
      const div = document.createElement('div');
      div.className = 'skel';
      div.style.height = Math.floor(Math.random() * (350 - 150 + 1) + 150) + 'px';
      placeholders[i % colCount].appendChild(div);
  }

  api('photos.get',`owner_id=${OWNER}&album_id=${id}&rev=${rev}&extended=1&count=1000`,'setPhotos');
}

function getColCount() {
    let w = window.innerWidth;
    if (!w || w === 0) w = document.documentElement.clientWidth;
    if (!w || w === 0) w = document.body.clientWidth;
    // Force at least 3 columns for desktop-ish widths even if detection is slightly off
    // But mostly rely on w
    if (w > 1200) return 4;
    if (w > 800) return 3;
    if (w > 500) return 2;
    return 1;
}

function extractTags(items) {
    const tags = new Set();
    items.forEach(item => {
        const text = item.text || '';
        const matches = text.match(/#[а-яА-Яa-zA-Z0-9_]+/g);
        if (matches) {
            matches.forEach(tag => tags.add(tag));
        }
    });
    return Array.from(tags);
}

function renderTags() {
    const container = document.getElementById('tags-bar');
    if (!container) return;
    container.style.display = 'none';
    container.innerHTML = '';
}

function filterByTag(tag, btnElement) {
    activeTag = tag;
    
    const buttons = document.querySelectorAll('.tag-chip');
    buttons.forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    
    renderYears();
    renderPhotosFromData();
}

function renderPhotosFromData() {
  const r = document.getElementById('area');
  r.innerHTML = '';

  const colCount = getColCount();
  const columns = [];
  
  for(let i=0; i<colCount; i++) {
      const col = document.createElement('div');
      col.className = 'masonry-col';
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
    if (searchQuery) {
        filteredPhotos = filteredPhotos.filter(p => matchesSearch(p, searchQuery));
    }
    if (activeTag) {
        filteredPhotos = filteredPhotos.filter(p => (p.text || '').includes(activeTag));
    }
    if (activeYear) {
        filteredPhotos = filteredPhotos.filter(p => p.date && new Date(p.date*1000).getFullYear() === activeYear);
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

    const img = document.createElement('img');
    img.dataset.src = photoObj.mid;
    img.alt = '';
    
    imgContainer.appendChild(img);
    
    const refBtn = document.createElement('div');
    refBtn.className = 'ref-overlay-btn';
    refBtn.dataset.url = photoObj.full;
    refBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
    refBtn.onclick = (e) => { e.stopPropagation(); toggleRefBtn(photoObj.full, refBtn); };
    if(selectedRefs.has(photoObj.full)) refBtn.classList.add('active');
    div.appendChild(refBtn);
    div.appendChild(imgContainer);

    div.onclick = () => openModal(originalIndex);

    const highlight = getMatchSnippet(p);
    if (highlight) {
        const badge = document.createElement('div');
        badge.className = 'search-highlight';
        badge.innerHTML = highlight;
        div.appendChild(badge);
    }

    columns[index % colCount].appendChild(div);
    observer.observe(div);
  });

  if(filteredPhotos.length === 0) {
      const reason = searchQuery ? `по запросу «${searchQuery}»` : (activeTag ? 'с таким тегом' : 'в этом альбоме');
      r.innerHTML = `<div class="empty-album">Нет работ ${reason}</div>`;
  }
  
  startBackgroundPreload();
}

window.addEventListener('resize', () => {
    if(alb && raw.length > 0) {
        renderPhotosFromData();
    } else if (!alb && document.getElementById('title').dataset.original === 'ОТЗЫВЫ') {
        loadReviews();
    }
});

window.setPhotos = d => {
  if(!d.response) {
    document.getElementById('area').innerHTML = '<div class="empty-album">В этом альбоме пока нет работ</div>';
    return;
  }
  const albumTitle = document.getElementById('title').dataset.original || '';
  raw = d.response.items;
  photos = raw.map(p => {
    const sizes = p.sizes || [];
    const gridPriority = ['x', 'r', 'q', 'p', 'o', 'm', 's'];
    let gridSize = null;
    for (const type of gridPriority) { gridSize = sizes.find(s => s.type === type); if (gridSize) break; }
    if (!gridSize && sizes.length > 0) gridSize = [...sizes].sort((a,b) => (a.width||999999) - (b.width||999999))[0];

    const viewPriority = ['z', 'y', 'x', 'w'];
    let viewSize = null;
    for (const type of viewPriority) { viewSize = sizes.find(s => s.type === type); if (viewSize) break; }
    if (!viewSize && sizes.length > 0) viewSize = [...sizes].sort((a,b) => (b.width||0) - (a.width||0))[0];

    const fullSize = sizes.length > 0 ? [...sizes].sort((a,b) => (b.width||0) - (a.width||0))[0] : null;

    return { mid: gridSize ? gridSize.url : '', view: viewSize ? viewSize.url : '', full: fullSize ? fullSize.url : '', width: viewSize ? viewSize.width : 100, height: viewSize ? viewSize.height : 100 };});
  
  raw.forEach((p, i) => {
      p.width = photos[i].width;
      p.height = photos[i].height;
      p.albumTitle = albumTitle;
      p.searchField = buildSearchField(p);
  });

  if (raw.length === 0) {
    document.getElementById('area').innerHTML = '<div class="empty-album">В этом альбоме пока нет работ</div>';
  } else {
    renderTags(); renderYears();
    renderPhotosFromData();
    // Safety re-render for layout stability
    setTimeout(renderPhotosFromData, 100);
  }

  const originalTitle = document.getElementById('title').dataset.original || 'Альбом';
  document.getElementById('title').innerText = `${originalTitle} · ${raw.length}`;
};

function toggleZoom(e) {
    if(window.innerWidth < 800) return;
    const container = document.getElementById('modal-img-container');
    const img = document.getElementById('full');

    if (container.classList.contains('zoomed')) {
        container.classList.remove('zoomed');
    } else {
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        container.style.setProperty('--mouse-x', `${percentX}%`);
        container.style.setProperty('--mouse-y', `${percentY}%`);
        container.classList.add('zoomed');
    }
    e.stopPropagation();
}

function openModal(i){
  const pBar = document.getElementById('modal-progress-bar'); if(pBar && photos.length) pBar.style.width = (((i + 1) / photos.length) * 100) + '%';
  const preview = document.getElementById('preview');
  preview.src = ''; 
  preview.classList.add('fading');
  
  const modalImgContainer = document.getElementById('modal-img-container');
  modalImgContainer.classList.remove('zoomed');

  document.getElementById('full').src = '';
  document.getElementById('full').classList.remove('loaded');

  idx=i;
  updateUrl(alb, i);
  const p=raw[idx];

  const ribbon = document.getElementById('modal-ribbon');
  const titleSource = document.getElementById('title').dataset.original || 'Портфолио';
  if (ribbon) {
      ribbon.textContent = currentSection === 'reviews' ? 'Отзывы' : '';
      ribbon.style.display = currentSection === 'reviews' ? 'block' : 'none';
  }

  const albumLink = document.getElementById('photo-album-link');
  if (albumLink) {
      const showAlbumLink = currentSection !== 'reviews' && !!titleSource;
      albumLink.textContent = titleSource;
      albumLink.href = alb ? `https://vk.com/album${OWNER}_${alb}` : '#';
      albumLink.style.display = showAlbumLink ? 'inline-flex' : 'none';
  }


    const siteLink = location.origin + location.pathname + '?album=' + alb + '&photo=' + (idx + 1);
    const isRef = selectedRefs.has(siteLink);
    const refBtnText = isRef ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> В референсах' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> В референсы';
    const refBtnClass = isRef ? 'ref-btn active' : 'ref-btn';
    const refContainer = document.getElementById('ref-btn-container');
    if(refContainer) {
        refContainer.innerHTML = `<button id="ref-btn" class="${refBtnClass}" onclick="toggleRef(${p.id}, '${siteLink}')">${refBtnText}</button>`;
    }


  document.getElementById('modal').classList.add('open');
  
  document.title = `Работа #${idx+1} - Роман Жегуляев — Портфолио`;

  preview.classList.remove('fading');
  preview.src = photos[idx].mid;
  
  document.getElementById('photo-index').innerText = `${idx+1} из ${raw.length}`;
  document.getElementById('vk-link-orig').href = `https://vk.com/photo${OWNER}_${p.id}`;
  const commentLink = document.getElementById('comment-link');
  if (commentLink) commentLink.href = `https://vk.com/photo${OWNER}_${p.id}`;

  document.getElementById('original-link').href = photos[idx].full;
  document.getElementById('download-link').href = photos[idx].full;

  document.getElementById('likes-count').innerText = p.likes.count;
  document.getElementById('likes-box').classList.toggle('has-likes', p.likes.count > 0);
  document.getElementById('comments-count').innerText = p.comments.count;

  const groupAvatar = groupInfo?.photo_50 || 'https://vk.com/images/camera_50.png';
  document.getElementById('header-avatar').src = groupAvatar;
  document.getElementById('header-author').innerText = 'Роман Жегуляев';
  document.getElementById('header-date').innerText = new Date(p.date*1000).toLocaleDateString('ru-RU');

  const textEl = document.getElementById('modal-text');
  textEl.innerText = p.text || '';
  textEl.classList.add('collapsed');
  
  setTimeout(() => {
    const btn = document.getElementById('show-more');
    if (textEl.scrollHeight > 100) {
        btn.classList.add('active');
        btn.innerText = 'Показать ещё';
    } else {
        btn.classList.remove('active');
    }
  }, 10);

  document.getElementById('comments-container').innerHTML = `
    <div class="comments-loader">
      <svg viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#888" stroke-width="5" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>`;

  api('photos.getComments', `owner_id=${OWNER}&photo_id=${p.id}&need_likes=1&extended=1`, 'setComments');

  
  document.getElementById('modal-loader').classList.add('active');
  document.getElementById('preview').classList.add('blur');
  const fullImg = new Image();
  fullImg.onload = () => { 
    if(idx===i){ 
      document.getElementById('full').src = fullImg.src; 
      document.getElementById('full').classList.add('loaded'); 
      document.getElementById('modal-loader').classList.remove('active');
      document.getElementById('preview').classList.remove('blur');
      preloadNeighbors(i);
    } 
  };
  fullImg.src = photos[idx].view;
  preloadNeighbors(i);

  scrollBeforeModal = window.scrollY; document.body.style.position = 'fixed'; document.body.style.top = `-${scrollBeforeModal}px`; document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
}

let touchStartY = 0;
let touchEndY = 0;
const modalContent = document.getElementById('modal-content-inner');

modalContent.addEventListener('touchstart', (e) => {
    if(document.getElementById('modal-img-container').classList.contains('zoomed')) return;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

modalContent.addEventListener('touchmove', (e) => {
    if(document.getElementById('modal-img-container').classList.contains('zoomed')) return;
    touchEndY = e.changedTouches[0].screenY;
    const diff = touchEndY - touchStartY;
    if(diff > 0 && window.innerWidth < 1000) {
        modalContent.style.transform = `translateY(${diff}px)`;
    }
}, {passive: true});

modalContent.addEventListener('touchend', (e) => {
    if(document.getElementById('modal-img-container').classList.contains('zoomed')) return;
    touchEndY = e.changedTouches[0].screenY;
    const diff = touchEndY - touchStartY;
    
    if (diff > 150 && window.innerWidth < 1000) {
        closeModal();
    } else {
        modalContent.style.transform = '';
    }
}, {passive: true});


function clearOrderPreview(dropState = true){
  const modal = document.getElementById('order-modal');
  if(!modal) return;
  modal.classList.remove('has-order');
  const sumEl = modal.querySelector('#order-total-sum');
  if(sumEl) sumEl.textContent = '—';
  const instructions = document.getElementById('order-instructions');
  if(instructions) instructions.textContent = 'Выберите удобный способ для связи и обсуждения проекта';
  const area = document.getElementById('order-text-area');
  if(area) {
    area.value = ORDER_HINT_TEXT;
    autosizeOrderArea();
  }
  setOrderHintVisible(true);
  if(dropState){
    lastOrderText = '';
    lastOrderTotal = '—';
    orderCleared = true;
  } else {
    orderCleared = false;
  }
  toggleOrderButtons(false);
}

function resetOrderModal(preserveLast = true){
  clearOrderPreview(!preserveLast);
  if(preserveLast && lastOrderText){
    setOrderPreview({ totalText: lastOrderTotal, text: lastOrderText });
  }
}

function applyOrderDetails(total, text){
  setOrderPreview({ totalText: total, text });
}

function openOrder(skipReset = false){
  const modal = document.getElementById('order-modal');
  if(!modal) return;
  if(!skipReset) resetOrderModal();
  primeOrderPreview();
  updateOrderHintAvatar();
  modal.classList.add('open');
}

function closeOrder(e){
  const modal = document.getElementById('order-modal');
  if(!modal) return;
  const target = e?.target;
  const clickedClose = target?.classList?.contains('order-close-btn-fixed') || target?.closest?.('.order-close-btn-fixed');
  if(!target || target.id === 'order-modal' || clickedClose){
    modal.classList.remove('open');
  }
}

function toggleText() {
    const textEl = document.getElementById('modal-text');
    const btn = document.getElementById('show-more');
    if (textEl.classList.contains('collapsed')) {
        textEl.classList.remove('collapsed');
        btn.innerText = 'Свернуть';
    } else {
        textEl.classList.add('collapsed');
        btn.innerText = 'Показать ещё';
    }
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка скопирована!');
    });
}

function copyOrderText(){
    if(!lastOrderText) { 
        showToast('Сначала выберите услуги в тарифах'); 
        return; 
    }
    navigator.clipboard.writeText(lastOrderText).then(() => {
        showToast('Состав заказа скопирован!');
    });
}

function sendOrderLink(channel){
  if(!lastOrderText){
    alert('Сначала сформируйте заявку в тарифах.');
    return;
  }
  const encoded = encodeURIComponent(lastOrderText);
  let link = '';
  if(channel === 'tg') link = `https://t.me/share/url?text=${encoded}`;
  else link = `https://vk.com/im?sel=${OWNER}&message=${encoded}`;
  const win = window.open(link, '_blank');
  if(!win || win.closed || typeof win.closed === 'undefined'){
    copyOrderText();
    alert('Не удалось открыть приложение. Состав скопирован — отправьте вручную.');
  }
}

window.setComments = d => {
    const cDiv = document.getElementById('comments-container');
    if(!d.response || d.response.items.length === 0) {
        cDiv.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#555;">Комментариев пока нет</div>`;
        return;
    }
    cDiv.innerHTML = '';
    const profiles = d.response.profiles || [];
    const groups = d.response.groups || [];

    d.response.items.forEach(c => {
        let ownerId = c.from_id;
        let user;
        if (ownerId > 0) {
            user = profiles.find(u => u.id === ownerId);
        } else {
            user = groups.find(g => g.id === -ownerId);
        }

        const photo = user?.photo_50 || user?.photo_100 || 'https://vk.com/images/camera_100.png';
        const name = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.name || 'Пользователь');
        
        let attachmentsHTML = '';
        if (c.attachments) {
            const photosAtt = c.attachments.filter(a => a.type === 'photo');
            if (photosAtt.length > 0) {
                attachmentsHTML = '<div class="comment-attachments">';
                photosAtt.forEach(ph => {
                    const size = ph.photo.sizes.sort((a,b) => b.width - a.width)[0];
                    const small = ph.photo.sizes.find(s => s.type === 'q') || size;
                    attachmentsHTML += `<img src="${small.url}" class="comment-attach-img" onclick="window.open('${size.url}', '_blank')">`;
                });
                attachmentsHTML += '</div>';
            }
        }
        
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
            <img class="comment-avatar" src="${photo}" onerror="this.src='https://vk.com/images/camera_100.png'">
            <div class="comment-body">
                <span class="comment-name" onclick="window.open('https://vk.com/id${Math.abs(ownerId)}', '_blank')">${name}</span>
                <div class="comment-text">${c.text || ''}</div>
                ${attachmentsHTML}
                <div style="color:#666; font-size:11px; margin-top:4px;">${new Date(c.date*1000).toLocaleDateString('ru-RU')}</div>
            </div>`;
        cDiv.appendChild(item);
    });
};

function move(d){ idx=(idx+d+photos.length)%photos.length; openModal(idx); }

function closeModal(e){ 
  if (e && e.target !== document.getElementById('modal') && e.target.closest && !e.target.closest('.close-in-modal')) return;
  document.getElementById('modal').classList.remove('open'); 
  document.getElementById('order-modal').classList.remove('open');
  document.title = 'Роман Жегуляев — Портфолио';
  document.getElementById('modal-content-inner').style.transform = '';
  updateUrl(alb, null, currentServiceId, currentFolderId, currentSection === 'main' ? null : currentSection);
  document.body.style.overflow = ''; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; window.scrollTo(0, scrollBeforeModal); 
}

function goBack(){ 
  if(hist.length > 0){ 
    const p=hist.pop(); 
    menuShow(p.l,p.t,p.b); 
    updateUrl();
  } 
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal({target: document.getElementById('modal')});
    if (document.getElementById('modal').classList.contains('open')) {
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
    }
});

api('photos.getAlbums',`owner_id=${OWNER}&need_covers=1`,'saveCovers');

function toggleRef(id, url) {
    const btn = document.getElementById('ref-btn');
    if (selectedRefs.has(url)) {
        selectedRefs.delete(url);
        if(btn) { btn.classList.remove('active'); btn.innerText = 'Добавить в референсы'; }
    } else {
        selectedRefs.add(url);
        if(selectedRefs.size > 3) {
            showToast('Лучше выбрать 2-3 примера, этого достаточно (но можно и больше)');
        }
        if(btn) { btn.classList.add('active'); btn.innerText = 'В референсах (удалить)'; }
    }
    updateRefBar();
}

function copyRefs() {
    const links = Array.from(selectedRefs).join('\n');
    navigator.clipboard.writeText(links).then(() => { alert('Ссылки скопированы!'); });
}
function clearRefs() {
    selectedRefs.clear();
    updateRefBar();
    const btn = document.getElementById('ref-btn');
    if(btn) { btn.classList.remove('active'); btn.innerText = 'Добавить в референсы'; }
}


function showToast(msg) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg);
        return;
    }
    let t = document.getElementById('toast');
    if(!t) {
        t = document.createElement('div');
        t.id = 'toast';
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleRef(id, url) {
    const btn = document.getElementById('ref-btn');
    if (selectedRefs.has(url)) {
        selectedRefs.delete(url);
        if(btn) {
            btn.classList.remove('active');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> В референсы';
        }
    } else {
        selectedRefs.add(url);
        if(selectedRefs.size > 3) {
            showToast('Лучше выбрать 2-3 примера, этого достаточно (но можно и больше)');
        }
        if(btn) {
            btn.classList.add('active');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> В референсах';
        }
    }
    updateRefBar();
}



function copyRefs() {
    const links = Array.from(selectedRefs).join('\n');
    navigator.clipboard.writeText(links).then(() => {
        showToast('Ссылки скопированы!');
    });
}

function clearRefs() {
    selectedRefs.clear();
    updateRefBar();
    const btn = document.getElementById('ref-btn');
    if(btn) { 
        btn.classList.remove('active'); 
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> В референсы'; 
    }
}



function preloadImage(url) { if (!url) return; const img = new Image(); img.src = url; }
function preloadNeighbors(index) {
  if (!photos || photos.length === 0) return;
  const nextIdx = (index + 1) % photos.length; if (photos[nextIdx]?.view) preloadImage(photos[nextIdx].view);
  const prevIdx = (index - 1 + photos.length) % photos.length; if (photos[prevIdx]?.view) preloadImage(photos[prevIdx].view);
  const nextNextIdx = (index + 2) % photos.length; if (photos[nextNextIdx]?.view) preloadImage(photos[nextNextIdx].view);
}


function renderFooterSocials() {
  const area = document.getElementById('area');
  if (!area) return;
  if (document.querySelector('.footer-socials')) return;
  const footer = document.createElement('div');
  footer.className = 'footer-socials';
  footer.innerHTML = `
    <a href="https://vk.com/dsgnjr" target="_blank" class="footer-link" title="Группа ВКонтакте">
      <div class="footer-icon vk-group-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.013 19.43c-5.83 0-9.138-3.99-9.278-10.645H8.62c.1 4.88 2.25 6.944 3.955 7.37V8.785h2.75v4.209c1.683-.18 3.44-2.09 4.037-4.21h2.75a8.77 8.77 0 01-3.71 5.378 8.875 8.875 0 014.288 5.268h-3.023a5.55 5.55 0 00-4.04-3.614v3.614h-1.874z"/></svg>
      </div>
      <div class="footer-text"><div class="footer-title">Группа VK</div><div class="footer-sub" id="vk-group-members">Подписаться</div></div>
    </a>
    <a href="https://t.me/r_zhegulyaev" target="_blank" class="footer-link" title="Telegram канал">
      <div class="footer-icon tg-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.91-1.27 4.85-2.11 5.82-2.52 2.77-1.16 3.35-1.36 3.72-1.37.08 0 .27.02 .39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
      </div>
      <div class="footer-text"><div class="footer-title">Telegram</div><div class="footer-sub">3к+ подписчиков</div></div>
    </a>
    <a href="https://vk.com/zhegulyaev" target="_blank" class="footer-link" title="Страница ВКонтакте">
      <div class="footer-icon vk-user-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.013 19.43c-5.83 0-9.138-3.99-9.278-10.645H8.62c.1 4.88 2.25 6.944 3.955 7.37V8.785h2.75v4.209c1.683-.18 3.44-2.09 4.037-4.21h2.75a8.77 8.77 0 01-3.71 5.378 8.875 8.875 0 014.288 5.268h-3.023a5.55 5.55 0 00-4.04-3.614v3.614h-1.874z"/></svg>
      </div>
      <div class="footer-text"><div class="footer-title">Страница VK</div><div class="footer-sub">Профиль</div></div>
    </a>
    <a href="https://www.behance.net/r_zhegulyaev" target="_blank" class="footer-link" title="Behance">
      <div class="footer-icon be-icon">
        <svg viewBox="0 0 16 16"><path fill="currentColor" d="M4.654 3c.461 0 .887.035 1.278.14.39.07.711.216.996.391s.497.426.641.747c.14.32.216.711.216 1.137 0 .496-.106.922-.356 1.242-.215.32-.566.606-.997.817.606.176 1.067.496 1.348.922s.461.957.461 1.563c0 .496-.105.922-.285 1.278a2.3 2.3 0 0 1-.782.887c-.32.215-.711.39-1.137.496a5.3 5.3 0 0 1-1.278.176L0 12.803V3zm-.285 3.978c.39 0 .71-.105.957-.285.246-.18.355-.497.355-.887 0-.216-.035-.426-.105-.567a1 1 0 0 0-.32-.355 1.8 1.8 0 0 0-.461-.176c-.176-.035-.356-.035-.567-.035H2.17v2.31c0-.005 2.2-.005 2.2-.005zm.105 4.193c.215 0 .426-.035.606-.07.176-.035.356-.106.496-.216s.25-.215.356-.39c.07-.176.14-.391.14-.641 0-.496-.14-.852-.426-1.102-.285-.215-.676-.32-1.137-.32H2.17v2.734h2.305zm6.858-.035q.428.427 1.278.426c.39 0 .746-.106 1.032-.286q.426-.32.53-.64h1.74c-.286.851-.712 1.457-1.278 1.848-.566.355-1.243.566-2.06.566a4.1 4.1 0 0 1-1.527-.285 2.8 2.8 0 0 1-1.137-.782 2.85 2.85 0 0 1-.712-1.172c-.175-.461-.25-.957-.25-1.528 0-.531.07-1.032.25-1.493.18-.46.426-.852.747-1.207.32-.32.711-.606 1.137-.782a4 4 0 0 1 1.493-.285c.606 0 1.137.105 1.598.355.46.25.817.532 1.102.958.285.39.496.851.641 1.348.07.496.105.996.07 1.563h-5.15c0 .58.21 1.11.496 1.396m2.24-3.732c-.25-.25-.642-.391-1.103-.391-.32 0-.566.07-.781.176s-.356.25-.496.39a.96.96 0 0 0-.25.497c-.036.175-.07.32-.07.46h3.196c-.07-.526-.25-.882-.497-1.132zm-3.127-3.728h3.978v.957h-3.978z"/></svg>
      </div>
      <div class="footer-text"><div class="footer-title">Behance</div><div class="footer-sub">Портфолио</div></div>
    </a>
    <a href="https://ru.pinterest.com/zhegulyaev/" target="_blank" class="footer-link" title="Pinterest">
      <div class="footer-icon pin-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.487-.695-2.435-2.878-2.435-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/></svg>
      </div>
      <div class="footer-text"><div class="footer-title">Pinterest</div><div class="footer-sub">Вдохновение</div></div>
    </a>
  `;
  area.insertAdjacentElement('afterend', footer);
  updateFooterMembers();
}
function updateFooterMembers() {
  if (typeof groupInfo !== 'undefined' && groupInfo && groupInfo.members_count) {
    const el = document.getElementById('vk-group-members');
    if (el) el.textContent = groupInfo.members_count.toLocaleString('ru-RU') + ' подписчиков';
    const elPrimary = document.getElementById('vk-group-members-static');
    if (elPrimary) elPrimary.textContent = groupInfo.members_count.toLocaleString('ru-RU') + ' подписчиков';
  }
}
window.addEventListener('DOMContentLoaded', renderFooterSocials);

// Smart tooltips for info icons
const dynamicTooltip = document.createElement('div');
dynamicTooltip.className = 'dynamic-tooltip';
dynamicTooltip.style.visibility = 'hidden';
document.body.appendChild(dynamicTooltip);
let tooltipTimeout;
dynamicTooltip.addEventListener('mouseenter', () => clearTimeout(tooltipTimeout));
dynamicTooltip.addEventListener('mouseleave', hideDynamicTooltip);

function showDynamicTooltip(target) {
    clearTimeout(tooltipTimeout);
    
    const text = target?.dataset?.tooltip;
    const exampleUrl = target?.dataset?.example;
    
    if (!text && !exampleUrl) return;

    let html = `<div>${text || ''}</div>`;
    if (exampleUrl) {
        html += `<div class="tooltip-example-link" onclick="openExampleModal('${exampleUrl}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Посмотреть пример
                 </div>`;
    }
    
    dynamicTooltip.innerHTML = html;
    dynamicTooltip.dataset.placement = 'top';
    dynamicTooltip.style.visibility = 'hidden';
    dynamicTooltip.style.opacity = '0';
    dynamicTooltip.style.display = 'block';
    dynamicTooltip.style.pointerEvents = 'auto';

    const rect = target.getBoundingClientRect();
    const spacing = 12;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    dynamicTooltip.style.left = `${rect.left + rect.width / 2}px`; 
    dynamicTooltip.style.transform = 'translate(-50%, -10px)';
    
    let topPos = rect.top + scrollY - dynamicTooltip.offsetHeight - spacing;
    
    if (rect.top - dynamicTooltip.offsetHeight - spacing < 0) {
        topPos = rect.bottom + scrollY + spacing;
        dynamicTooltip.dataset.placement = 'bottom';
        dynamicTooltip.style.transform = 'translate(-50%, 10px)';
    }
    
    dynamicTooltip.style.top = `${topPos}px`;
    
    dynamicTooltip.style.visibility = 'visible';
    requestAnimationFrame(() => {
        dynamicTooltip.style.opacity = '1';
        dynamicTooltip.style.transform = dynamicTooltip.dataset.placement === 'bottom' 
            ? 'translate(-50%, 0)' 
            : 'translate(-50%, 0)';
    });
}

function hideDynamicTooltip() {
    tooltipTimeout = setTimeout(() => {
        dynamicTooltip.style.opacity = '0';
        dynamicTooltip.style.visibility = 'hidden';
        dynamicTooltip.style.pointerEvents = 'none';
    }, 300);
}

document.addEventListener('mouseover', (e) => {
    const icon = e.target.closest('.info-icon');
    if (icon) {
        showDynamicTooltip(icon);
        return;
    }
    if (e.target.closest('.dynamic-tooltip')) {
        clearTimeout(tooltipTimeout);
        return;
    }
});

document.addEventListener('mouseout', (e) => {
    const toEl = e.relatedTarget;
    const fromTooltip = e.target.closest('.dynamic-tooltip');
    const fromIcon = e.target.closest('.info-icon');
    const goingInside = toEl && (toEl.closest('.dynamic-tooltip') || toEl.closest('.info-icon'));
    if (!goingInside && (fromTooltip || fromIcon)) {
        hideDynamicTooltip();
    }
});

function openExampleModal(url) {
    const modal = document.getElementById('review-photo-modal');
    const img = document.getElementById('review-photo-modal-img');
    if (!modal || !img) return;
    img.src = url;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}


window.addEventListener('scroll', () => {
    // Progress Bar Logic
    const bar = document.getElementById('header-progress');
    if (alb && bar) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = scrollPercent + '%';
    }

    const btn = document.getElementById('scroll-top');
    if (!btn) return;
    if (window.scrollY > 300) {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
    }
});
