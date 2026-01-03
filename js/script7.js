function switchTab(tabId, btn){
  const p = document.getElementById('tab-portfolio');
  const t = document.getElementById('tab-tariffs');
  if(!p || !t) return;
  p.style.display = 'none';
  t.style.display = 'none';
  const target = document.getElementById('tab-' + tabId);
  if(target) target.style.display = 'block';

  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else {
    if(tabId === 'portfolio' && btns[0]) btns[0].classList.add('active');
    if(tabId === 'tariffs' && btns[1]) btns[1].classList.add('active');
  }

  if(tabId === 'tariffs') window.location.hash = 'tariffs';
  else window.location.hash = '';

  if(tabId === 'portfolio' && currentSection === 'reviews') {
    currentSection = 'main';
    updateUrl();
    hist = [];
    menuShow(menu, "ПОРТФОЛИО");
  }
}

window.addEventListener('load', function(){
  if(window.location.hash === '#tariffs') switchTab('tariffs');
  ensureTariffKeys();
  document.querySelectorAll('.tariff-wrapper').forEach(w => recalcPrice(w));
  tariffDefaults = getTariffStateSnapshot();
  const saved = getTariffStateFromQuery() || loadTariffStateFromStorage();
  if(saved) applyTariffStateSnapshot(saved); else updateGlobalSummary();
  document.querySelectorAll('.choice-pills').forEach(updateMobileCoverState);
  primeOrderPreview(true);
});

  function toggleAddons(btn) {
    const list = btn.nextElementSibling;
    if(!list) return;
    list.classList.toggle('open');
    const sp = btn.querySelector('span');
    if(sp) sp.textContent = list.classList.contains('open') ? '−' : '+';
  }

  function handleChoiceChange(input){
    const group = input.closest('.choice-pills');
    const pill = input.closest('.choice-pill');
    if(!group || !pill) return;
    group.querySelectorAll('.choice-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    updateMobileCoverState(group);
    const wrapper = input.closest('.tariff-wrapper');
    if(wrapper) recalcPrice(wrapper);
  }

  function updateMobileCoverState(group){
    if(!group || group.dataset.label !== 'Мобильная обложка') return;
    const row = group.closest('.choice-row')?.querySelector('.mobile-cover-state');
    if(!row) return;
    const selected = group.querySelector('input:checked');
    const label = selected?.dataset.stateLabel || (selected?.value || '').split(' ').pop();
    row.textContent = label || '';
  }

function toggleQtyState(cb){
  const li = cb.closest('li[data-mode="qty"]');
  if(!li) return;
  const valEl = li.querySelector('.qty-val');
  const min = parseInt(li.dataset.min || '0', 10);
  const base = parseInt(li.dataset.baseQty || '0', 10);
  if(!cb.checked){
    if(valEl) valEl.textContent = '0';
  } else {
    const fallback = base > 0 ? base : Math.max(1, min);
    if(valEl) valEl.textContent = Math.max(parseInt(valEl.textContent || '0', 10), fallback);
  }
  const wrapper = cb.closest('.tariff-wrapper');
  if(wrapper) recalcPrice(wrapper);
}

function changeQty(btn, delta, minQty, maxQty) {
  const control = btn.closest('.qty-control');
  if(!control) return;
  if(control.classList.contains('disabled')) return;
  const valEl = control.querySelector('.qty-val');
  const li = control.closest('li[data-mode="qty"]');
  if(li){
    if(!li.dataset.min) li.dataset.min = String(minQty);
    if(!li.dataset.max) li.dataset.max = String(maxQty);
    const cb = li.querySelector('.qty-checkbox');
    if(cb && !cb.checked && !cb.disabled) return;
    minQty = parseInt(li.dataset.min || String(minQty), 10);
    maxQty = parseInt(li.dataset.max || String(maxQty), 10);
  }
  const currentVal = parseInt(valEl.textContent || '0', 10);
  const newVal = currentVal + delta;
  if(newVal < minQty) {
    showToast("Нельзя уменьшить ниже минимума");
    return;
  }
  let clamped = newVal;
  if(maxQty >= 0 && clamped > maxQty) clamped = maxQty;
  valEl.textContent = clamped;
  const wrapper = btn.closest('.tariff-wrapper');
  if(wrapper) recalcPrice(wrapper);
}

const persistTariffStateDebounced = debounce(() => {
  if(restoringTariffs) return;
  const snapshot = getTariffStateSnapshot();
  try { localStorage.setItem(TARIFF_STATE_KEY, JSON.stringify(snapshot)); } catch(e) {}
  updateConfigParam(snapshot, true);
}, 350);

function encodeConfig(snapshot){
  try { return btoa(encodeURIComponent(JSON.stringify(snapshot))); } catch(e) { return ''; }
}

function decodeConfig(str){
  try { return JSON.parse(decodeURIComponent(atob(str))); } catch(e) { return null; }
}

function updateConfigParam(snapshot, replaceOnly = false){
  const url = new URL(window.location.href);
  if(snapshot && Object.keys(snapshot || {}).length){
    const encoded = encodeConfig(snapshot);
    if(encoded) url.searchParams.set(TARIFF_CONFIG_PARAM, encoded);
  } else {
    url.searchParams.delete(TARIFF_CONFIG_PARAM);
  }
  const next = url.toString();
  if(replaceOnly) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
}

function ensureTariffKeys(){
  document.querySelectorAll('.tariff-wrapper').forEach((wrapper, idx) => {
    const name = (wrapper.querySelector('.tariff-title')?.textContent || '').trim() || `Тариф ${idx+1}`;
    const tariffId = wrapper.dataset.tariffId || slugify(name) || `tariff-${idx+1}`;
    wrapper.dataset.tariffId = tariffId;
    wrapper.dataset.tariffName = name;
    wrapper.querySelectorAll('li.tariff-feature-item').forEach((li, i) => {
      if(!li.dataset.key) li.dataset.key = `${tariffId}-item-${i}`;
      const cb = li.querySelector('input.feature-checkbox');
      if(cb && !cb.dataset.key) cb.dataset.key = `${tariffId}-cb-${i}`;
    });
    wrapper.querySelectorAll('.choice-pills').forEach((group, i) => {
      if(!group.dataset.key) group.dataset.key = `${tariffId}-choice-${i}`;
      updateMobileCoverState(group);
    });
  });
}

function getInputKey(cb){
  return cb?.dataset?.key || cb?.closest('li')?.dataset?.key;
}

function updatePrice(el){
  const wrapper = el.closest('.tariff-wrapper');
  if(wrapper) recalcPrice(wrapper);
}

function recalcPrice(wrapper){
  const basePrice = parseInt(wrapper.dataset.basePrice || '0', 10);
  let total = basePrice;

  // checkboxes
  wrapper.querySelectorAll('input.feature-checkbox').forEach(cb => {
    if(cb.checked) total += parseInt(cb.dataset.price || '0', 10);
    const li = cb.closest('li');
    if(li && li.dataset.type === 'base') {
      if(!cb.checked) li.classList.add('excluded');
      else li.classList.remove('excluded');
    }
  });

  wrapper.querySelectorAll('.choice-pills input:checked').forEach(choice => {
    total += parseInt(choice.dataset.price || '0', 10);
  });

  // qty rows
  wrapper.querySelectorAll('li[data-mode="qty"]').forEach(li => {
    const unit = parseInt(li.dataset.unitPrice || '0', 10);
    const baseQty = parseInt(li.dataset.baseQty || '0', 10);
    const curr = parseInt((li.querySelector('.qty-val')||{}).textContent || '0', 10);
    const min = parseInt(li.dataset.min || '0', 10);
    const cb = li.querySelector('.qty-checkbox');
    const active = !cb || cb.checked || cb.disabled;
    const control = li.querySelector('.qty-control');
    if(control) control.classList.toggle('disabled', !active);

    let appliedQty = curr;
    if(active){
      if(appliedQty < min){ appliedQty = min; const valEl = li.querySelector('.qty-val'); if(valEl) valEl.textContent = appliedQty; }
      const diff = appliedQty - baseQty;
      total += diff * unit;
    } else {
      appliedQty = 0;
      const valEl = li.querySelector('.qty-val');
      if(valEl) valEl.textContent = '0';
      // Исправление: вычитаем стоимость базового количества, так как элемент отключен
      const diff = 0 - baseQty;
      total += diff * unit;
    }

    if(li.dataset.type === 'base') {
      if(appliedQty === 0) li.classList.add('excluded');
      else li.classList.remove('excluded');
    }
  });

  if(total < 0) total = 0;
  const priceEl = wrapper.querySelector('.tariff-price');
  if(priceEl) {
    priceEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
    priceEl.dataset.value = total;
  }
  wrapper.dataset.totalValue = total;
  handleTariffChange(wrapper);
  return total;
}

function collectTariffLines(wrapper){
  let lines = [];
  wrapper.querySelectorAll('input.feature-checkbox:checked').forEach(cb => {
    const li = cb.closest('li');
    const choice = li?.querySelector?.('.choice-pills input:checked');
    const choiceVal = choice?.value?.toLowerCase() || '';
    if (choiceVal.includes('анимир')) return;
    const txt = (li && li.innerText) ? li.innerText.trim() : '';
    const clean = txt.split('\n')[0].replace(/\s+\?\s*$/, '').trim();
    if(clean) lines.push(clean);
  });

  wrapper.querySelectorAll('.choice-pills').forEach(group => {
    const active = group.querySelector('input:checked');
    if(!active) return;
    const pill = active.closest('.choice-pill');
    const text = pill && pill.innerText ? pill.innerText.trim() : (active.value || '');
    const label = group.dataset.label || 'Выбор';
    if(text) lines.push(`${label}: ${text}`);
  });

  wrapper.querySelectorAll('li[data-mode="qty"]').forEach(li => {
    const cb = li.querySelector('.qty-checkbox');
    const active = !cb || cb.checked || cb.disabled;
    const qty = parseInt((li.querySelector('.qty-val')||{}).textContent || '0', 10);
    if(active && qty > 0){
      const label = li.dataset.label || (li.querySelector('.item-left')||{}).innerText || 'Позиция';
      lines.push(label.trim() + ' — ' + qty + ' шт');
    }
  });

  return lines;
}

function buildOrderPayload(wrapper, tariffName){
  if(!wrapper) return null;
  const lines = collectTariffLines(wrapper);
  const totalText = (wrapper.querySelector('.tariff-price')||{}).textContent || '';
  const totalValue = parseInt(totalText.replace(/\D/g,'')) || 0;
  const text = `Заявка на тариф: ${tariffName}\n\nСостав:\n- ${lines.join('\n- ')}\n\nИтого: ${totalText}`;
  return { lines, totalText, totalValue, text, tariffName };
}

function toggleOrderButtons(enabled){
  document.querySelectorAll('.order-send-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

function setOrderPreview(payload){
  if(!payload) return;
  const modal = document.getElementById('order-modal');
  if(!modal) return;
  modal.classList.add('has-order');
  lastOrderText = payload.text || '';
  lastOrderTotal = payload.totalText || '—';
  orderCleared = false;
  const sumEl = modal.querySelector('#order-total-sum');
  if(sumEl) sumEl.textContent = payload.totalText || '—';
  const area = document.getElementById('order-text-area');
  if(area) {
    area.value = payload.text || '';
    autosizeOrderArea();
  }
  const instructions = document.getElementById('order-instructions');
  if(instructions) instructions.innerHTML = 'Отправьте заявку кнопками выше или выберите удобный мессенджер ниже.';
  setOrderHintVisible(false);
  toggleOrderButtons(!!payload.text);
}

function autosizeOrderArea() {
  const area = document.getElementById('order-text-area');
  if(!area) return;
  area.style.height = 'auto';
  area.style.height = area.scrollHeight + 'px';
}

function setOrderHintVisible(show) {
  const card = document.getElementById('order-hint-card');
  if(!card) return;
  card.style.display = show ? 'flex' : 'none';
}

function updateOrderHintAvatar() {
  const avatar = document.getElementById('order-hint-avatar');
  if(!avatar) return;
  const src = groupInfo?.photo_100 || groupInfo?.photo_50 || avatar.src;
  avatar.src = src;
}

function sendOrder(btn, tariffName){
  const wrapper = btn.closest('.tariff-wrapper');
  if(!wrapper) return;
  const payload = buildOrderPayload(wrapper, tariffName);
  if(payload){
    setOrderPreview(payload);
    openOrder(true);
  }
}

function getTariffTotalValue(wrapper){
  return parseInt(wrapper?.dataset?.totalValue || '0', 10) || 0;
}

function getTariffStateSnapshot(){
  const data = {};
  document.querySelectorAll('.tariff-wrapper').forEach(wrapper => {
    const id = wrapper.dataset.tariffId || wrapper.dataset.tariffName || slugify('tariff');
    const snapshot = { checkboxes: {}, qty: {}, choices: {}, total: getTariffTotalValue(wrapper), name: wrapper.dataset.tariffName || id };
    wrapper.querySelectorAll('input.feature-checkbox').forEach(cb => {
      const key = getInputKey(cb);
      if(key) snapshot.checkboxes[key] = cb.checked;
    });
    wrapper.querySelectorAll('li[data-mode="qty"]').forEach(li => {
      if(li.dataset.key) snapshot.qty[li.dataset.key] = parseInt((li.querySelector('.qty-val')||{}).textContent || '0', 10);
    });
    wrapper.querySelectorAll('.choice-pills').forEach(group => {
      const active = group.querySelector('input:checked');
      if(group.dataset.key) snapshot.choices[group.dataset.key] = active ? active.value : null;
    });
    data[id] = snapshot;
  });
  return { tariffs: data };
}

function applyTariffStateSnapshot(snapshot){
  if(!snapshot || !snapshot.tariffs) return;
  restoringTariffs = true;
  document.querySelectorAll('.tariff-wrapper').forEach(wrapper => {
    const saved = snapshot.tariffs[wrapper.dataset.tariffId];
    if(!saved) return;
    wrapper.querySelectorAll('input.feature-checkbox').forEach(cb => {
      const key = getInputKey(cb);
      if(key && saved.checkboxes && key in saved.checkboxes) cb.checked = !!saved.checkboxes[key];
    });
    wrapper.querySelectorAll('li[data-mode="qty"]').forEach(li => {
      const key = li.dataset.key;
      if(key && saved.qty && key in saved.qty){
        const val = parseInt(saved.qty[key], 10);
        const valEl = li.querySelector('.qty-val');
        if(valEl) valEl.textContent = val;
      }
    });
    wrapper.querySelectorAll('.choice-pills').forEach(group => {
      const key = group.dataset.key;
      if(!key || !saved.choices || !(key in saved.choices)) return;
      const val = saved.choices[key];
      const target = [...group.querySelectorAll('input[type="radio"]')].find(r => r.value === val);
      if(target){
        target.checked = true;
        handleChoiceChange(target);
      }
    });
    recalcPrice(wrapper);
  });
  restoringTariffs = false;
  updateGlobalSummary();
}

function loadTariffStateFromStorage(){
  try { return JSON.parse(localStorage.getItem(TARIFF_STATE_KEY) || ''); } catch(e) { return null; }
}

function getTariffStateFromQuery(){
  const { config } = getUrlParams();
  if(!config) return null;
  return decodeConfig(config);
}

function handleTariffChange(wrapper){
  updateGlobalSummary();
  if(restoringTariffs) return;
  persistTariffStateDebounced();
  if(!lastOrderText) primeOrderPreview();
}

function updateGlobalSummary(){
  const body = document.getElementById('tariff-summary-body');
  const totalEl = document.getElementById('tariff-summary-total');
  if(!body || !totalEl) return;
  const fragments = [];
  let grandTotal = 0;
  document.querySelectorAll('.tariff-wrapper').forEach(wrapper => {
    const tariffName = (wrapper.dataset.tariffName || wrapper.querySelector('.tariff-title')?.textContent || 'Тариф').trim();
    const payload = buildOrderPayload(wrapper, tariffName);
    grandTotal += payload?.totalValue || 0;
    const items = payload?.lines?.length ? payload.lines.map(l => `<li>${l}</li>`).join('') : '<li>Опции не выбраны</li>';
    fragments.push(`<div class="summary-tariff"><div class="summary-tariff-head"><div class="summary-tariff-name">${tariffName}</div><div class="summary-tariff-price">${payload?.totalText || '—'}</div></div><ul>${items}</ul></div>`);
  });
  body.innerHTML = fragments.join('');
  totalEl.textContent = grandTotal.toLocaleString('ru-RU') + ' ₽';
}

function primeOrderPreview(force = false){
  if(!force && (lastOrderText || orderCleared)) return;
  const first = document.querySelector('.tariff-wrapper');
  if(!first) return;
  const tariffName = (first.dataset.tariffName || first.querySelector('.tariff-title')?.textContent || 'Тариф').trim();
  const payload = buildOrderPayload(first, tariffName);
  if(payload) setOrderPreview(payload);
}

function resetTariffSelections(skipPreview = false){
  clearOrderPreview();
  try { localStorage.removeItem(TARIFF_STATE_KEY); } catch(e) {}
  updateConfigParam(null, true);
  if(tariffDefaults){
    applyTariffStateSnapshot(tariffDefaults);
    updateGlobalSummary();
    if(!skipPreview) primeOrderPreview(true);
  } else {
    updateGlobalSummary();
  }
}

function clearOrderSelection(){
  resetTariffSelections(true);
  const modal = document.getElementById('order-modal');
  if(modal) modal.scrollTop = 0;
}

function getShareableLink(snapshot){
  const url = new URL(window.location.href);
  const encoded = encodeConfig(snapshot);
  if(encoded) url.searchParams.set(TARIFF_CONFIG_PARAM, encoded);
  return url.toString();
}

function shareTariffConfig(){
  const snapshot = getTariffStateSnapshot();
  const link = getShareableLink(snapshot);
  updateConfigParam(snapshot, true);
  navigator.clipboard.writeText(link).then(() => alert('Ссылка на конфигурацию скопирована!'));
}

  // close modal on overlay click
  document.addEventListener('click', function(e){
    if(e.target && e.target.id === 'order-modal'){
    closeOrder(e);
  }
});
