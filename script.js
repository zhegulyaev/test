const clamp = (value, min = 0) => Math.max(min, value);

function updateQuantity(container, delta) {
  const valueNode = container.querySelector('.quantity__value');
  const current = Number(valueNode.textContent) || 0;
  const next = clamp(current + delta, 0);
  valueNode.textContent = next;
}

function bindQuantities(root) {
  root.querySelectorAll('[data-quantity]').forEach((container) => {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-change]');
      if (!button) return;
      event.preventDefault();
      updateQuantity(container, Number(button.dataset.change));
    });
  });
}

function bindIconMenus(root) {
  root.querySelectorAll('[data-icon-menu]').forEach((menu) => {
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('.icon-menu__item');
      if (!button) return;
      menu.querySelectorAll('.icon-menu__item').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
    });
  });
}

function bindAddons(plan) {
  const addons = plan.querySelector('[data-addons]');
  if (!addons) return;

  addons.querySelectorAll('.addon input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      addons.classList.toggle('addons--active', checkbox.checked);
    });
  });
}

function init() {
  const root = document;
  bindQuantities(root);
  bindIconMenus(root);
  root.querySelectorAll('[data-plan]').forEach((plan) => {
    bindAddons(plan);
  });
}

document.addEventListener('DOMContentLoaded', init);
