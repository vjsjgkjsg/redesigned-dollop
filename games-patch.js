/**
 * games-patch.js — Start screens, menu buttons, resize fixes
 * Запускается ПОСЛЕ games.js
 */
(function(){
'use strict';

const $ = id => document.getElementById(id);
const qsa = (sel, ctx) => Array.from((ctx||document).querySelectorAll(sel));

/* ═══════════════════════════════════════════════════
   КОНФИГИ СТАРТОВЫХ ЭКРАНОВ
═══════════════════════════════════════════════════ */
const GAME_CONFIGS = {
  puzzle: {
    icon: '🧩', title: 'Пазл «Петропавловск»',
    desc: 'Собери картинку достопримечательности города!',
    optGroups: [
      { label:'Картинка:', key:'img', opts:[
        {val:'ablai',label:'🏰 Резиденция'},{val:'park',label:'🌳 Парк'},
        {val:'sobor',label:'⛪ Собор'},{val:'step',label:'🌇 Степь'},
      ]},
      { label:'Сложность:', key:'grid', opts:[
        {val:'3',label:'3×3 Лёгкий'},{val:'4',label:'4×4 Средний'},{val:'5',label:'5×5 Сложный'},
      ]},
    ],
  },
  memory: {
    icon: '🃏', title: 'Найди пару',
    desc: 'Переворачивай карточки и находи одинаковые пары!',
    optGroups: [
      { label:'Набор карточек:', key:'memset', opts:[
        {val:'animals',label:'🐆 Животные'},{val:'sights',label:'🏛 Достопримечательности'},
        {val:'nature',label:'🌿 Природа'},{val:'objects',label:'🏠 Предметы'},
      ]},
    ],
  },
  quiz: {
    icon: '❓', title: 'Знаю свой город!',
    desc: '10 случайных вопросов о Петропавловске и Казахстане.',
    badges: ['🏙 Краеведение','🌿 Природа','🎨 Традиции'],
  },
  coloring: {
    icon: '🎨', title: 'Раскраска «Казахстан»',
    desc: 'Выбери картинку и раскрась! Сохрани свой шедевр.',
    optGroups: [
      { label:'Сцена:', key:'scene', opts:[
        {val:'0',label:'🏠 Юрта'},{val:'1',label:'🌄 Степь'},
        {val:'2',label:'🔷 Орнамент'},{val:'3',label:'🐆 Животные'},{val:'4',label:'🏙 Закат'},
      ]},
    ],
  },
  sort: {
    icon: '📦', title: 'Разложи по группам!',
    desc: 'Нажми предмет — выделится. Затем нажми нужную корзину.',
    optGroups: [
      { label:'Набор:', key:'sortmode', opts:[
        {val:'seasons',label:'🍂 Времена года'},{val:'animals',label:'🐺 Дикие/Домашние'},
        {val:'sizes',label:'🔴 Большой/Маленький'},{val:'food',label:'🍎 Фрукты/Овощи'},
      ]},
    ],
  },
};

const startSel = {
  puzzle:   { img:'ablai', grid:'3' },
  memory:   { memset:'animals' },
  quiz:     {},
  coloring: { scene:'0' },
  sort:     { sortmode:'seasons' },
};

/* ═══════════════════════════════════════════════════
   СТАРТОВЫЙ ЭКРАН — оверлей ПОВЕРХ контента
   Не прячем контент — просто перекрываем оверлеем
═══════════════════════════════════════════════════ */
function buildStartScreen(gameId, cfg) {
  const panel = $('game-' + gameId);
  if (!panel || $('gss-' + gameId)) return;

  let optsHtml = '';
  if (cfg.badges) {
    optsHtml += '<div class="gss-badges">' +
      cfg.badges.map(b=>'<span class="gss-badge">'+b+'</span>').join('') + '</div>';
  }
  if (cfg.optGroups) {
    cfg.optGroups.forEach(g => {
      optsHtml += '<div class="gss-opt-group"><span class="gss-opt-label">'+g.label+'</span><div class="gss-opts-row">';
      g.opts.forEach(o => {
        const active = startSel[gameId][g.key] === o.val ? ' active' : '';
        optsHtml += '<button class="gss-opt'+active+'" data-key="'+g.key+'" data-val="'+o.val+'">'+o.label+'</button>';
      });
      optsHtml += '</div></div>';
    });
  }

  const ss = document.createElement('div');
  ss.id = 'gss-' + gameId;
  ss.className = 'gss-overlay';
  ss.innerHTML =
    '<div class="gss-card">' +
    '<div class="gss-icon">'+cfg.icon+'</div>' +
    '<h2 class="gss-title">'+cfg.title+'</h2>' +
    '<p class="gss-desc">'+cfg.desc+'</p>' +
    optsHtml +
    '<button class="gss-play-btn" id="gss-play-'+gameId+'">&#9654; Начать игру!</button>' +
    '</div>';

  panel.style.position = 'relative';
  panel.appendChild(ss);

  qsa('.gss-opt', ss).forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.gss-opt[data-key="'+btn.dataset.key+'"]', ss).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      startSel[gameId][btn.dataset.key] = btn.dataset.val;
    });
  });

  $('gss-play-' + gameId).addEventListener('click', () => {
    gameStarted[gameId] = true;
    applyAndStart(gameId);
  });
}

function showStartScreen(gameId) {
  const ss = $('gss-' + gameId);
  if (ss) ss.style.display = 'flex';
}

function hideStartScreen(gameId) {
  const ss = $('gss-' + gameId);
  if (ss) ss.style.display = 'none';
}

function applyAndStart(gameId) {
  hideStartScreen(gameId);
  const sel = startSel[gameId];
  requestAnimationFrame(() => {
    const inits = window._gameInits || {};
    switch(gameId) {
      case 'puzzle': {
        const imgBtn = document.querySelector('.pthumb[data-img="'+sel.img+'"]');
        if (imgBtn && !imgBtn.classList.contains('active')) imgBtn.click();
        const diffBtn = document.querySelector('.puzzle-difficulty .diff-btn[data-grid="'+sel.grid+'"]');
        if (diffBtn && !diffBtn.classList.contains('active')) diffBtn.click();
        if (inits.puzzleInit) inits.puzzleInit();
        break;
      }
      case 'memory': {
        const memBtn = document.querySelector('[data-memset="'+sel.memset+'"]');
        if (memBtn && !memBtn.classList.contains('active')) memBtn.click();
        if (inits.memInit) inits.memInit();
        break;
      }
      case 'quiz':
        if (inits.quizInit) inits.quizInit();
        break;
      case 'coloring':
        if (inits.colorInit) inits.colorInit();
        requestAnimationFrame(() => {
          const th = document.querySelectorAll('.coloring-thumb')[parseInt(sel.scene||'0')];
          if (th) th.click();
        });
        break;
      case 'sort': {
        const sBtn = document.querySelector('[data-sortmode="'+sel.sortmode+'"]');
        if (sBtn && !sBtn.classList.contains('active')) sBtn.click();
        if (inits.sortInit) inits.sortInit();
        break;
      }
    }
  });
}

/* ═══════════════════════════════════════════════════
   СТРОИМ СТАРТОВЫЕ ЭКРАНЫ + ПОКАЗЫВАЕМ ДЛЯ ПЕРВОЙ
═══════════════════════════════════════════════════ */
Object.entries(GAME_CONFIGS).forEach(([id, cfg]) => buildStartScreen(id, cfg));
showStartScreen('puzzle'); // первая активная игра

/* ═══════════════════════════════════════════════════
   ПЕРЕКЛЮЧЕНИЕ ИГР — onav-btn
═══════════════════════════════════════════════════ */
const gameStarted = {};

qsa('.onav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const gid = btn.dataset.game;
    qsa('.onav-btn').forEach(b=>b.classList.remove('active'));
    qsa('.game-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    const panel = $('game-' + gid);
    if (panel) panel.classList.add('active');
    if (!gameStarted[gid]) showStartScreen(gid);
    else hideStartScreen(gid);
  });
});

/* ═══════════════════════════════════════════════════
   КНОПКА «В МЕНЮ» В ЗАГОЛОВКЕ ИГРЫ
═══════════════════════════════════════════════════ */
Object.keys(GAME_CONFIGS).forEach(gameId => {
  const panel = $('game-' + gameId);
  if (!panel) return;
  const ctrl = panel.querySelector('.game-controls-top');
  if (!ctrl || ctrl.querySelector('.btn-to-menu')) return;

  const btn = document.createElement('button');
  btn.className = 'btn-to-menu';
  btn.title = 'В меню';
  btn.innerHTML = '&#8962;';
  btn.addEventListener('click', () => {
    gameStarted[gameId] = false;
    ['puzzle-win','memory-win','sort-win'].forEach(id => {
      const el = $(id); if (el) el.classList.add('hidden');
    });
    if (gameId === 'quiz') {
      const qa=$('quiz-question-area'), qf=$('quiz-finish-area');
      if (qa) qa.classList.remove('hidden');
      if (qf) qf.classList.add('hidden');
    }
    showStartScreen(gameId);
  });
  ctrl.insertBefore(btn, ctrl.firstChild);
});

/* ═══════════════════════════════════════════════════
   «В МЕНЮ» В WIN-ОВЕРЛЕЯХ
═══════════════════════════════════════════════════ */
function addMenuToWin(winId, gameId) {
  const winBox = document.querySelector('#'+winId+' .win-box');
  if (!winBox) return;
  const existingBtn = winBox.querySelector('.win-btn');
  if (!existingBtn || existingBtn.parentElement.classList.contains('win-btns')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'win-btns';
  existingBtn.parentElement.insertBefore(wrapper, existingBtn);
  wrapper.appendChild(existingBtn);
  const mb = document.createElement('button');
  mb.className = 'win-btn win-btn-sec';
  mb.textContent = '\u2302 В меню';
  mb.addEventListener('click', () => {
    $(winId).classList.add('hidden');
    gameStarted[gameId] = false;
    showStartScreen(gameId);
  });
  wrapper.appendChild(mb);
}
addMenuToWin('puzzle-win','puzzle');
addMenuToWin('memory-win','memory');
addMenuToWin('sort-win','sort');

(function(){
  const fa = $('quiz-finish-area');
  if (!fa) return;
  const btn = fa.querySelector('.win-btn');
  if (!btn || btn.parentElement.classList.contains('win-btns')) return;
  const wrap = document.createElement('div');
  wrap.className = 'win-btns';
  btn.parentElement.insertBefore(wrap, btn);
  wrap.appendChild(btn);
  const mb = document.createElement('button');
  mb.className = 'win-btn win-btn-sec';
  mb.textContent = '\u2302 В меню';
  mb.addEventListener('click', () => {
    fa.classList.add('hidden');
    const qa=$('quiz-question-area');
    if (qa) qa.classList.remove('hidden');
    gameStarted['quiz'] = false;
    showStartScreen('quiz');
  });
  wrap.appendChild(mb);
})();

/* ═══════════════════════════════════════════════════
   RESIZE — canvas и puzzle
═══════════════════════════════════════════════════ */
function resizeCanvas() {
  const canvas = $('color-canvas');
  if (!canvas) return;
  const stage = canvas.parentElement;
  if (!stage) return;
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  const maxW = Math.min(stage.clientWidth || 520, 520);
  const newH = Math.round(maxW * 400 / 520);
  if (Math.abs(canvas.width - maxW) < 10) return;
  canvas.width = maxW; canvas.height = newH;
  canvas.getContext('2d').drawImage(tmp, 0, 0, maxW, newH);
}
window.addEventListener('resize', () => { clearTimeout(window._rcT); window._rcT = setTimeout(resizeCanvas, 200); });

function recalcPuzzle() {
  const inits = window._gameInits;
  if (!inits || !inits.puzzleInit) return;
  const board = $('puzzle-board');
  if (!board || !board.children.length) return;
  const ss = $('gss-puzzle');
  if (ss && ss.style.display !== 'none') return;
  inits.puzzleInit();
}
window.addEventListener('resize', () => { clearTimeout(window._rpT); window._rpT = setTimeout(recalcPuzzle, 400); });

/* ═══════════════════════════════════════════════════
   TOUCH — сортировка
═══════════════════════════════════════════════════ */
document.addEventListener('touchmove', function(e) {
  const t = e.touches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  qsa('.sort-bucket').forEach(b=>b.classList.remove('hover-target'));
  if (el) { const b = el.closest('.sort-bucket'); if (b) b.classList.add('hover-target'); }
}, { passive: true });

/* ═══════════════════════════════════════════════════
   СТИЛИ — вставляем в <head>
═══════════════════════════════════════════════════ */
const style = document.createElement('style');
style.textContent = `
.game-panel { position: relative; }
.gss-overlay {
  position: absolute; inset: 0; z-index: 50;
  background: linear-gradient(160deg,#0a1f3a 0%,#0d2b4a 50%,#0a1f3a 100%);
  display: flex; align-items: center; justify-content: center;
  border-radius: 18px; padding: 20px;
}
.gss-card {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12);
  border-radius: 20px; padding: 32px 28px; text-align: center;
  max-width: 480px; width: 100%; box-shadow: 0 8px 40px rgba(0,0,0,.4);
}
.gss-icon  { font-size: 3rem; margin-bottom: 12px; display: block; }
.gss-title { font-size: 1.35rem; font-weight: 900; color: #fff; margin-bottom: 8px; }
.gss-desc  { font-size: 13px; color: rgba(255,255,255,.6); margin-bottom: 20px; line-height: 1.5; }
.gss-badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin-bottom: 18px; }
.gss-badge  { background: rgba(230,168,23,.18); border: 1px solid rgba(230,168,23,.4); color: #f5d06a; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 20px; }
.gss-opt-group { margin-bottom: 14px; }
.gss-opt-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 7px; }
.gss-opts-row  { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.gss-opt {
  padding: 7px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.07); color: rgba(255,255,255,.75);
  font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .18s;
}
.gss-opt:hover  { background: rgba(255,255,255,.15); color: #fff; }
.gss-opt.active { background: rgba(25,118,210,.5); border-color: #64b5f6; color: #fff; }
.gss-play-btn {
  margin-top: 20px; padding: 13px 36px; border-radius: 30px; border: none;
  background: linear-gradient(135deg,#1976D2,#42a5f5); color: #fff;
  font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer;
  transition: all .2s; box-shadow: 0 4px 20px rgba(25,118,210,.45); width: 100%;
}
.gss-play-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(25,118,210,.6); }
.gss-play-btn:active { transform: none; }
.btn-to-menu {
  width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.7); font-size: 16px;
  cursor: pointer; transition: all .18s; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
}
.btn-to-menu:hover { background: rgba(255,255,255,.18); color: #fff; }
.win-btns { display: flex; flex-direction: column; gap: 10px; align-items: center; margin-top: 4px; }
.win-btn-sec {
  padding: 10px 28px; border-radius: 24px; background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.25); color: rgba(255,255,255,.75);
  font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .18s;
}
.win-btn-sec:hover { background: rgba(255,255,255,.2); color: #fff; }
.puzzle-piece, .mem-card, .sort-item, .sort-bucket,
.onav-btn, .gss-opt, .gtab, .diff-btn, .pthumb {
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
}
#games-header { height: auto !important; min-height: 58px; padding: 8px 16px !important; }
.gh-inner { flex-wrap: wrap; gap: 8px; }
.gh-right  { flex-shrink: 0; }
@media (max-width: 480px) {
  .gh-age-badge { display: none; }
  .gh-records-btn { padding: 5px 10px; font-size: 11px; }
}
`;
document.head.appendChild(style);

})();
