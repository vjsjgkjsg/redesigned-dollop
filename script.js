/**
 * Цифровой навигатор педагога — Петропавловск
 * script.js — логика навигации, меню, аккордеонов
 */

(function () {
  'use strict';

  // ──────────────────────────────
  // ЭЛЕМЕНТЫ
  // ──────────────────────────────
  const burgerBtn      = document.getElementById('burger-btn');
  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const closeSidebar   = document.getElementById('close-sidebar');
  const accessBtn      = document.getElementById('accessibility-btn');
  const backWrap       = document.getElementById('back-btn-wrap');
  const backBtn        = document.getElementById('back-home-btn');
  const toast          = document.getElementById('toast');
  const body           = document.body;

  // ──────────────────────────────
  // НАВИГАЦИЯ (SPA)
  // ──────────────────────────────
  function showSection(name) {
    // Скрыть все секции
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    const target = document.getElementById('section-' + name);
    if (!target) return;
    target.classList.add('active');

    // Прокрутить наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Кнопка «Назад»
    if (name === 'home') {
      backWrap.classList.remove('visible');
    } else {
      backWrap.classList.add('visible');
    }

    // Подсветить активный пункт в десктоп-навигации
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === name);
    });

    // Закрыть сайдбар (если открыт)
    closeSidebarMenu();
  }

  // Делегирование: все клики по [data-section]
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-section]');
    if (el && el.tagName !== 'A') {
      e.preventDefault();
      const sec = el.dataset.section;
      if (sec) showSection(sec);
    }
    // Для <a data-section> внутри footer и sidebar
    if (el && el.tagName === 'A' && el.dataset.section) {
      e.preventDefault();
      showSection(el.dataset.section);
    }
  });

  // Кнопка «Вернуться на главную»
  backBtn.addEventListener('click', function () {
    showSection('home');
  });

  // ──────────────────────────────
  // САЙДБАР
  // ──────────────────────────────
  function openSidebarMenu() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    burgerBtn.classList.add('open');
    burgerBtn.setAttribute('aria-expanded', 'true');
    body.style.overflow = 'hidden';
  }

  function closeSidebarMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    burgerBtn.classList.remove('open');
    burgerBtn.setAttribute('aria-expanded', 'false');
    body.style.overflow = '';
  }

  burgerBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) {
      closeSidebarMenu();
    } else {
      openSidebarMenu();
    }
  });

  closeSidebar.addEventListener('click', closeSidebarMenu);
  sidebarOverlay.addEventListener('click', closeSidebarMenu);

  // Закрыть сайдбар клавишей Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebarMenu();
  });

  // ──────────────────────────────
  // ВЕРСИЯ ДЛЯ СЛАБОВИДЯЩИХ
  // ──────────────────────────────
  let accessMode = false;

  accessBtn.addEventListener('click', function () {
    accessMode = !accessMode;
    body.classList.toggle('accessible', accessMode);
    accessBtn.title = accessMode ? 'Обычная версия' : 'Версия для слабовидящих';
    accessBtn.querySelector('.eye-icon').textContent = accessMode ? '🔲' : '👁';
    showToast(accessMode
      ? 'Режим для слабовидящих включён (ч/б, крупный шрифт)'
      : 'Обычный режим восстановлен'
    );
  });

  // ──────────────────────────────
  // АККОРДЕОНЫ
  // ──────────────────────────────
  document.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const item   = this.closest('.accordion-item');
      const body   = item.querySelector('.accordion-body');
      const isOpen = this.classList.contains('open');

      // Закрыть другие открытые аккордеоны в той же группе
      const group = this.closest('.accordion-group');
      if (group) {
        group.querySelectorAll('.accordion-trigger.open').forEach(function (t) {
          if (t !== trigger) {
            t.classList.remove('open');
            const b = t.closest('.accordion-item').querySelector('.accordion-body');
            if (b) {
              b.style.maxHeight = b.scrollHeight + 'px';
              requestAnimationFrame(function () { b.style.maxHeight = '0'; });
              setTimeout(function () { b.style.display = 'none'; b.style.maxHeight = ''; }, 280);
            }
          }
        });
      }

      if (isOpen) {
        // Закрыть
        this.classList.remove('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(function () { body.style.maxHeight = '0'; });
        setTimeout(function () { body.style.display = 'none'; body.style.maxHeight = ''; }, 280);
      } else {
        // Открыть
        this.classList.add('open');
        body.style.display = 'block';
        body.style.overflow = 'hidden';
        body.style.maxHeight = '0';
        requestAnimationFrame(function () {
          body.style.transition = 'max-height 0.28s ease';
          body.style.maxHeight = body.scrollHeight + 'px';
        });
        setTimeout(function () {
          body.style.maxHeight = '';
          body.style.overflow = '';
          body.style.transition = '';
        }, 300);
      }
    });
  });

  // ──────────────────────────────
  // ТОСТ / УВЕДОМЛЕНИЕ
  // ──────────────────────────────
  let toastTimer = null;

  function showToast(message, duration) {
    duration = duration || 3000;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, duration);
  }

  // ──────────────────────────────
  // ИМИТАЦИЯ СКАЧИВАНИЯ
  // ──────────────────────────────
  window.fakeDownload = function (filename) {
    showToast('⬇ Скачивание: ' + filename + ' — добавьте реальный файл на сервер!', 4000);
  };

  // ──────────────────────────────
  // АКТИВНЫЙ ПУНКТ ПРИ ЗАГРУЗКЕ
  // ──────────────────────────────
  showSection('home');

})();
