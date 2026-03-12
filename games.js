/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  ИГРОВАЯ КОМНАТА v3.0 — ИДЕАЛЬНАЯ ВЕРСИЯ                 ║
 * ║  Цифровой навигатор педагога | Петропавловск              ║
 * ║                                                           ║
 * ║  ИГРЫ:                                                    ║
 * ║  1. Пазл «Петропавловск» — sliding puzzle                ║
 * ║  2. Память «Найди пару» — memory cards                   ║
 * ║  3. Викторина «Знаю свой город»                          ║
 * ║  4. Раскраска — canvas paint                             ║
 * ║  5. Сортировка — drag & drop + touch                     ║
 * ║                                                           ║
 * ║  НОВИНКИ v3:                                              ║
 * ║  ✓ Web Audio API — звуки из кода (без файлов!)           ║
 * ║  ✓ Таблица рекордов localStorage                         ║
 * ║  ✓ Анимации конфетти/фейерверк                           ║
 * ║  ✓ Система достижений                                    ║
 * ║  ✓ Плавные переходы и micro-interactions                 ║
 * ║  ✓ Полная поддержка touch/планшет                        ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

(function () {
'use strict';

/* ══════════════════════════════════════════
   УТИЛИТЫ
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const qs = (s, c) => (c||document).querySelector(s);
const qsa = (s, c) => Array.from((c||document).querySelectorAll(s));
const rnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const shuffle = a => { const r=a.slice(); for(let i=r.length-1;i>0;i--){const j=rnd(0,i);[r[i],r[j]]=[r[j],r[i]];} return r; };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

/* ══════════════════════════════════════════
   WEB AUDIO ENGINE — звуки из кода, без файлов
══════════════════════════════════════════ */
const Audio = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e) {}
    }
    return ctx;
  }
  function tone(freq, type, dur, vol, delay=0, decay=null) {
    const ac = getCtx(); if(!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ac.currentTime + delay);
    g.gain.setValueAtTime(0, ac.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol||0.18, ac.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    o.start(ac.currentTime + delay);
    o.stop(ac.currentTime + delay + dur + 0.05);
  }
  function noise(dur, vol=0.1) {
    const ac = getCtx(); if(!ac) return;
    const buf = ac.createBuffer(1, ac.sampleRate*dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*vol;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    src.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+dur);
    src.start(); src.stop(ac.currentTime+dur+0.05);
  }
  return {
    click()   { tone(800,'square',0.05,0.08); },
    flip()    { tone(440,'sine',0.12,0.14); tone(550,'sine',0.12,0.08,0.06); },
    match()   { tone(523,'sine',0.1,0.18); tone(659,'sine',0.1,0.18,0.1); tone(784,'sine',0.2,0.18,0.2); },
    wrong()   { tone(200,'sawtooth',0.18,0.14); tone(160,'sawtooth',0.18,0.1,0.1); },
    correct() { tone(660,'sine',0.1,0.18); tone(880,'sine',0.15,0.18,0.1); },
    slide()   { tone(350,'sine',0.07,0.1); },
    win()     {
      [523,659,784,1047].forEach((f,i)=>tone(f,'sine',0.18,0.22,i*0.12));
      setTimeout(()=>confetti(),400);
    },
    bigWin()  {
      [523,659,784,1047,1319].forEach((f,i)=>tone(f,'sine',0.25,0.28,i*0.1));
      setTimeout(()=>confetti(120),300);
    },
    start()   { tone(440,'sine',0.08,0.15); tone(550,'sine',0.08,0.15,0.09); },
    tick()    { tone(1200,'square',0.03,0.06); },
    pop()     { tone(600,'sine',0.06,0.12); noise(0.04,0.06); },
    paint()   { tone(rnd(300,900),'sine',0.04,0.05); },
    drop()    { tone(rnd(400,700),'triangle',0.08,0.12); },
  };
})();

/* ══════════════════════════════════════════
   КОНФЕТТИ (canvas overlay)
══════════════════════════════════════════ */
function confetti(count=80) {
  let canvas = document.getElementById('confetti-canvas');
  if(!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#f1c40f','#e74c3c','#2ecc71','#3498db','#9b59b6','#e67e22','#1abc9c','#e91e90'];
  const particles = Array.from({length:count},()=>({
    x: Math.random()*canvas.width,
    y: -20,
    r: rnd(5,12),
    c: colors[rnd(0,colors.length-1)],
    vx: (Math.random()-0.5)*6,
    vy: rnd(3,8),
    rot: Math.random()*360,
    vr: (Math.random()-0.5)*8,
    shape: rnd(0,2),
  }));
  let frame, t=0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.rot+=p.vr; p.vx*=0.99;
      if(p.y<canvas.height+30) alive=true;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c;
      if(p.shape===0){ ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r); }
      else if(p.shape===1){ ctx.beginPath();ctx.arc(0,0,p.r/2,0,Math.PI*2);ctx.fill(); }
      else { ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(p.r*0.6,p.r*0.6);ctx.lineTo(-p.r*0.6,p.r*0.6);ctx.closePath();ctx.fill(); }
      ctx.restore();
    });
    if(alive&&t++<300) frame=requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); cancelAnimationFrame(frame); }
  }
  cancelAnimationFrame(frame); t=0; draw();
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastTimer=null;
function toast(msg, dur=3000, type='') {
  const el=$('games-toast');
  el.textContent=msg;
  el.className='show '+(type||'');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.className='',dur);
}

/* ══════════════════════════════════════════
   ТАБЛИЦА РЕКОРДОВ — Supabase (привязаны к user_id)
══════════════════════════════════════════ */
const SB_URL  = 'https://ljtogliylpubvkckpwyv.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdG9nbGl5bHB1YnZrY2twd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzEzODQsImV4cCI6MjA4ODc0NzM4NH0.91EQ_EEfi8X09Vm0jmH12_35R6tf0BwtTGoX3K5lgfc';

async function getCurrentUser() {
  if (typeof SESSION !== 'undefined') return await SESSION.getUser();
  return null;
}

async function sbGames(path, opts={}) {
  try {
    const res = await fetch(SB_URL+'/rest/v1/'+path, {
      headers:{'apikey':SB_ANON,'Authorization':'Bearer '+SB_ANON,
        'Content-Type':'application/json','Prefer':'return=representation',...(opts.headers||{})},
      ...opts
    });
    if(!res.ok) return null;
    return res.json().catch(()=>null);
  } catch(e){ return null; }
}

/* ── Records: Supabase + localStorage cache (fallback) ── */
const Records = {
  _cache: {},  // in-memory cache for current session

  _uid() { return getCurrentUser()?.id || 'guest'; },

  /* Load all records for current user into cache */
  async loadAll() {
    const uid = this._uid();
    if(uid === 'guest') {
      // guest: use localStorage as before
      try { this._cache = JSON.parse(localStorage.getItem('pedagog_records_v3'))||{}; } catch(e){}
      return;
    }
    const rows = await sbGames(`game_records?user_id=eq.${encodeURIComponent(uid)}&select=game_key,score`);
    if(rows) {
      this._cache = {};
      rows.forEach(r => { this._cache[r.game_key] = r.score; });
    } else {
      // fallback to localStorage if offline
      try { this._cache = JSON.parse(localStorage.getItem('pedagog_records_v3'))||{}; } catch(e){}
    }
  },

  get(game) { return this._cache[game] ?? null; },

  async update(game, val, isLower=true) {
    const cur = this.get(game);
    const isBetter = cur === null || (isLower ? val < cur : val > cur);
    if(!isBetter) return false;
    this._cache[game] = val;  // update cache immediately
    const uid = this._uid();
    if(uid === 'guest') {
      // save to localStorage for guest
      try {
        const d = JSON.parse(localStorage.getItem('pedagog_records_v3'))||{};
        d[game] = val;
        localStorage.setItem('pedagog_records_v3', JSON.stringify(d));
      } catch(e){}
      return true;
    }
    // Upsert to Supabase
    await sbGames('game_records', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: uid, game_key: game, score: val, updated_at: new Date().toISOString() })
    });
    return true;
  }
};

/* ══════════════════════════════════════════
   ДОСТИЖЕНИЯ — Supabase (привязаны к user_id)
══════════════════════════════════════════ */
const Achievements = {
  defs: {
    first_puzzle:   { icon:'🧩', title:'Первый пазл!',      desc:'Собрал первый пазл' },
    speed_puzzle:   { icon:'⚡', title:'Молния!',            desc:'Пазл 3×3 за < 30 сек' },
    hard_puzzle:    { icon:'🏆', title:'Мастер пазлов!',    desc:'Собрал пазл 5×5' },
    first_memory:   { icon:'🃏', title:'Первая память!',    desc:'Завершил Memory игру' },
    perfect_memory: { icon:'💎', title:'Идеальная память!', desc:'Memory без единой ошибки' },
    quiz_master:    { icon:'🎓', title:'Знаток города!',    desc:'10/10 в викторине' },
    quiz_5:         { icon:'📚', title:'Умник!',             desc:'5 правильных ответов подряд' },
    first_color:    { icon:'🎨', title:'Художник!',          desc:'Сохранил раскраску' },
    sort_perfect:   { icon:'✨', title:'Всё по полочкам!',  desc:'Сортировка без ошибок' },
  },
  _cache: new Set(),  // in-memory set of unlocked ids

  async loadAll() {
    const uid = getCurrentUser()?.id;
    if(!uid) {
      try {
        const list = JSON.parse(localStorage.getItem('pedagog_achievements_v3'))||[];
        this._cache = new Set(list);
      } catch(e){}
      return;
    }
    const rows = await sbGames(`game_achievements?user_id=eq.${encodeURIComponent(uid)}&select=achievement_id`);
    if(rows) {
      this._cache = new Set(rows.map(r => r.achievement_id));
    } else {
      try {
        const list = JSON.parse(localStorage.getItem('pedagog_achievements_v3'))||[];
        this._cache = new Set(list);
      } catch(e){}
    }
  },

  has(id) { return this._cache.has(id); },

  async unlock(id) {
    if(this.has(id)) return;
    this._cache.add(id);
    const def = this.defs[id]; if(!def) return;
    showAchievement(def);
    const uid = getCurrentUser()?.id;
    if(!uid) {
      // guest: localStorage
      try {
        const list = JSON.parse(localStorage.getItem('pedagog_achievements_v3'))||[];
        if(!list.includes(id)) { list.push(id); localStorage.setItem('pedagog_achievements_v3', JSON.stringify(list)); }
      } catch(e){}
      return;
    }
    await sbGames('game_achievements', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: uid, achievement_id: id })
    });
  }
};

function showAchievement(def) {
  let el=document.getElementById('achievement-popup');
  if(!el){
    el=document.createElement('div'); el.id='achievement-popup';
    document.body.appendChild(el);
  }
  el.innerHTML=`<span class="ach-icon">${def.icon}</span><div><strong>Достижение!</strong><br>${def.title}<small>${def.desc}</small></div>`;
  el.className='show';
  Audio.win();
  setTimeout(()=>el.className='',3500);
}

/* ══════════════════════════════════════════
   ПЕРЕКЛЮЧЕНИЕ ОНЛАЙН / ОФЛАЙН
══════════════════════════════════════════ */
qsa('.gtab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    Audio.click();
    qsa('.gtab').forEach(b=>b.classList.remove('active'));
    qsa('.gtab-content').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    $('tab-'+btn.dataset.tab).classList.add('active');
  });
});

/* onav-btn panel switching handled by games-patch.js
   Here we only handle the audio click */
qsa('.onav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{ Audio.click(); });
});

/* ══════════════════════════════════════════════════════
   ██████╗ ███████╗ █████╗ ██╗
   ██╔══██╗██╔════╝██╔══██╗██║
   ██████╔╝█████╗  ███████║██║
   ██╔══██╗██╔══╝  ██╔══██║██║
   ██║  ██║███████╗██║  ██║███████╗
   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝
   ИГРА 1: ПАЗЛ
══════════════════════════════════════════════════════ */
const PUZZLE_IMGS = {
  ablai: { emoji:'🏰', label:'Резиденция Абылай хана',
    cols:['#1a3a6b','#2d5a9e','#3c6fba','#1a2d5a','#4a7fce','#0d1f3c','#5a8fd8','#2a4f8a','#3a5f9a',
          '#1c3e70','#2e5ca0','#4070b8','#163260','#4880c8','#0c1c3a','#3a6888','#1a3858'] },
  park:  { emoji:'🌳', label:'Парк Победы',
    cols:['#1a5c2a','#2d8a46','#3da85a','#0d3d1a','#4ec870','#1a7a38','#5ed880','#0a2d14','#228844',
          '#1b6030','#308848','#40b060','#0e4020','#4ec06a','#186830','#50c878','#0a3018'] },
  sobor: { emoji:'⛪', label:'Собор Петра и Павла',
    cols:['#5d4037','#8d6e63','#a07868','#3e2723','#b08888','#6d4c41','#c09898','#4a3028','#7a5c50',
          '#604238','#906868','#a87060','#402820','#b09090','#705048','#c0a0a0','#503830'] },
  step:  { emoji:'🌇', label:'Казахская степь',
    cols:['#f57f17','#ffb300','#ffd040','#e65100','#ffe060','#ff8f00','#ffda00','#bf360c','#ffc200',
          '#f08020','#ffb830','#ffd858','#e05800','#ffe878','#ff9810','#ffe020','#c84010'] },
};

let PS = { grid:3, img:'ablai', tiles:[], emptyPos:0, moves:0, time:0, interval:null, solved:false, best:{} };

function puzzleIsSolvable(t, g) {
  const arr=t.filter(x=>x!==g*g-1); let inv=0;
  for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++) if(arr[i]>arr[j]) inv++;
  if(g%2===1) return inv%2===0;
  const er=Math.floor(t.indexOf(g*g-1)/g);
  return (inv+er)%2===1;
}

function puzzleInit() {
  clearInterval(PS.interval);
  const {grid,img}=PS; const total=grid*grid;
  let tiles; do{ tiles=shuffle(Array.from({length:total},(_,i)=>i)); } while(!puzzleIsSolvable(tiles,grid));
  PS.tiles=tiles; PS.emptyPos=tiles.indexOf(total-1); PS.moves=0; PS.time=0; PS.solved=false;
  $('puzzle-moves').textContent='0';
  $('puzzle-timer').textContent='0:00';
  $('puzzle-win').classList.add('hidden');
  const rec=Records.get('puzzle_'+grid);
  $('puzzle-record').textContent = rec !== null ? '🏆 Рекорд: '+rec+' ход' : '—';
  PS.interval=setInterval(()=>{
    if(!PS.solved){ PS.time++; const m=Math.floor(PS.time/60),s=PS.time%60; $('puzzle-timer').textContent=m+':'+String(s).padStart(2,'0'); }
  },1000);
  puzzleRender();
  Audio.start();
}

function puzzleRender() {
  const {grid,img,tiles}=PS; const total=grid*grid;
  const board=$('puzzle-board');
  const imgData=PUZZLE_IMGS[img];
  const maxW = Math.min(window.innerWidth-80, 420);
  const cellSize = Math.floor((maxW-grid*3)/grid);
  board.style.gridTemplateColumns=`repeat(${grid},1fr)`;
  board.innerHTML='';
  tiles.forEach((val,idx)=>{
    const piece=document.createElement('div');
    piece.className='puzzle-piece'+(val===total-1?' empty':'');
    piece.style.width=cellSize+'px'; piece.style.height=cellSize+'px';
    if(val!==total-1){
      const col=imgData.cols[val%imgData.cols.length];
      const row2=Math.floor(val/grid), col2=val%grid;
      // Создаём градиент для каждой ячейки
      const col2nd=imgData.cols[(val+3)%imgData.cols.length];
      piece.style.background=`linear-gradient(135deg,${col},${col2nd})`;
      piece.innerHTML=`<div class="ppi">${val+1}</div>`;
      if(val===idx) piece.classList.add('correct');
    } else {
      piece.innerHTML='<div class="ppi" style="opacity:0.3;font-size:20px">⬜</div>';
    }
    piece.addEventListener('click',()=>puzzleClick(idx));
    board.appendChild(piece);
  });
}

async function puzzleClick(idx) {
  if(PS.solved) return;
  const {tiles,grid}=PS; const empty=PS.emptyPos; const total=grid*grid;
  const er=Math.floor(empty/grid),ec=empty%grid;
  const cr=Math.floor(idx/grid),cc=idx%grid;
  if(Math.abs(er-cr)+Math.abs(ec-cc)!==1) return;
  Audio.slide();
  [tiles[empty],tiles[idx]]=[tiles[idx],tiles[empty]];
  PS.emptyPos=idx; PS.moves++;
  $('puzzle-moves').textContent=PS.moves;
  puzzleRender();
  if(tiles.every((v,i)=>v===i)){
    PS.solved=true; clearInterval(PS.interval);
    const isNew=await Records.update('puzzle_'+grid, PS.moves);
    $('puzzle-record').textContent='🏆 Рекорд: '+Records.get('puzzle_'+grid)+' ход';
    setTimeout(()=>{
      const m=Math.floor(PS.time/60),s=PS.time%60;
      $('puzzle-win-moves').textContent=PS.moves;
      $('puzzle-win-time').textContent=m+':'+String(s).padStart(2,'0');
      $('puzzle-win-new-rec').style.display=isNew?'block':'none';
      $('puzzle-win').classList.remove('hidden');
      Audio.bigWin();
      await Achievements.unlock('first_puzzle');
      if(grid===5) await Achievements.unlock('hard_puzzle');
      if(grid===3&&PS.time<30) await Achievements.unlock('speed_puzzle');
    },350);
  }
}

qsa('.pthumb').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('.pthumb').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  PS.img=btn.dataset.img; puzzleInit();
}));
qsa('.puzzle-difficulty .diff-btn').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('.puzzle-difficulty .diff-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  PS.grid=parseInt(btn.dataset.grid); puzzleInit();
}));
$('puzzle-new').addEventListener('click',puzzleInit);
$('puzzle-win-new').addEventListener('click',()=>{ $('puzzle-win').classList.add('hidden'); puzzleInit(); });

/* ══════════════════════════════════════════════════════
   ███╗   ███╗███████╗███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗
   ████╗ ████║██╔════╝████╗ ████║██╔═══██╗██╔══██╗╚██╗ ██╔╝
   ██╔████╔██║█████╗  ██╔████╔██║██║   ██║██████╔╝ ╚████╔╝
   ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║██╔══██╗  ╚██╔╝
   ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║
   ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
   ИГРА 2: ПАМЯТЬ
══════════════════════════════════════════════════════ */
const MEM_SETS = {
  animals: [
    {e:'🐆',l:'Барс'},{e:'🦅',l:'Беркут'},{e:'🐺',l:'Волк'},{e:'🦊',l:'Лиса'},
    {e:'🐇',l:'Заяц'},{e:'🦌',l:'Олень'},{e:'🐴',l:'Лошадь'},{e:'🦔',l:'Ёж'},
    {e:'🦢',l:'Лебедь'},{e:'🦉',l:'Сова'},
  ],
  sights: [
    {e:'🏰',l:'Резиденция'},{e:'🌳',l:'Парк Победы'},{e:'⛪',l:'Собор'},{e:'🕌',l:'Мечеть'},
    {e:'🎭',l:'Театр'},{e:'🏛',l:'Музей'},{e:'🌉',l:'Мост'},{e:'🏙',l:'Центр'},
    {e:'🌊',l:'Река Есиль'},{e:'🎡',l:'Парк аттракционов'},
  ],
  nature: [
    {e:'🌻',l:'Подсолнух'},{e:'🌾',l:'Пшеница'},{e:'🍂',l:'Листья'},{e:'❄️',l:'Снег'},
    {e:'🌷',l:'Тюльпан'},{e:'🌞',l:'Солнце'},{e:'🌊',l:'Река'},{e:'🌵',l:'Кактус'},
    {e:'🍄',l:'Гриб'},{e:'🦋',l:'Бабочка'},
  ],
  objects: [
    {e:'🏠',l:'Дом'},{e:'🎒',l:'Рюкзак'},{e:'📚',l:'Книги'},{e:'✏️',l:'Карандаш'},
    {e:'🎨',l:'Краски'},{e:'🎵',l:'Музыка'},{e:'🚌',l:'Автобус'},{e:'⚽',l:'Мяч'},
    {e:'🎸',l:'Гитара'},{e:'🌍',l:'Глобус'},
  ],
};

let MS = { set:'animals', pairs:[], flipped:[], matched:0, moves:0, locked:false, combo:0, startTime:0 };

function memInit() {
  const all=MEM_SETS[MS.set];
  const pairs=shuffle(all).slice(0,8);
  const doubled=shuffle([...pairs,...pairs]);
  MS.pairs=doubled; MS.flipped=[]; MS.matched=0; MS.moves=0; MS.locked=false; MS.combo=0; MS.startTime=Date.now();
  $('mem-pairs').textContent='0/'+pairs.length;
  $('mem-moves').textContent='0';
  $('mem-stars').textContent='⭐⭐⭐';
  $('memory-win').classList.add('hidden');
  const rec=Records.get('memory_'+MS.set);
  $('mem-record').textContent=rec?'🏆 '+rec+' ход':'—';
  const board=$('memory-board');
  board.innerHTML='';
  doubled.forEach((card,i)=>{
    const el=document.createElement('div');
    el.className='mem-card'; el.dataset.idx=i; el.dataset.emoji=card.e;
    el.innerHTML=`<div class="mem-card-inner">
      <div class="mem-card-front"><span class="mem-front-icon">⭐</span></div>
      <div class="mem-card-back"><span>${card.e}</span><small>${card.l}</small></div>
    </div>`;
    el.addEventListener('click',()=>memClick(el,i));
    board.appendChild(el);
  });
  Audio.start();
}

async function memClick(el,idx) {
  if(MS.locked||el.classList.contains('flipped')||el.classList.contains('matched')) return;
  Audio.flip();
  el.classList.add('flipped');
  MS.flipped.push({el,idx});
  if(MS.flipped.length===2){
    MS.locked=true; MS.moves++;
    $('mem-moves').textContent=MS.moves;
    const [a,b]=MS.flipped;
    if(MS.pairs[a.idx].e===MS.pairs[b.idx].e){
      MS.combo++;
      setTimeout(()=>{
        a.el.classList.add('matched'); b.el.classList.add('matched');
        MS.matched++;
        const total=8;
        $('mem-pairs').textContent=MS.matched+'/'+total;
        const ratio=MS.moves/total;
        $('mem-stars').textContent=ratio<1.4?'⭐⭐⭐':ratio<2?'⭐⭐':'⭐';
        MS.flipped=[]; MS.locked=false;
        Audio.match();
        if(MS.combo>=3) toast('🔥 Комбо x'+MS.combo+'!','2000','combo');
        if(MS.matched===total){
          const elapsed=Math.round((Date.now()-MS.startTime)/1000);
          const isNew=await Records.update('memory_'+MS.set,MS.moves);
          $('mem-record').textContent='🏆 '+Records.get('memory_'+MS.set)+' ход';
          const ratio2=MS.moves/total;
          const stars=ratio2<1.4?3:ratio2<2?2:1;
          setTimeout(()=>{
            $('mem-win-emoji').textContent=stars===3?'🏆':stars===2?'🎉':'👍';
            $('mem-win-text').textContent=`Все пары за ${MS.moves} ходов! (${elapsed} сек)`;
            $('mem-win-stars').textContent='⭐'.repeat(stars);
            $('mem-win-newrec').style.display=isNew?'block':'none';
            $('memory-win').classList.remove('hidden');
            Audio.bigWin();
            await Achievements.unlock('first_memory');
            if(MS.moves<=total) await Achievements.unlock('perfect_memory');
          },500);
        }
      },500);
    } else {
      MS.combo=0;
      Audio.wrong();
      a.el.classList.add('mem-error'); b.el.classList.add('mem-error');
      setTimeout(()=>{
        a.el.classList.remove('flipped','mem-error');
        b.el.classList.remove('flipped','mem-error');
        MS.flipped=[]; MS.locked=false;
      },950);
    }
  }
}

qsa('[data-memset]').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('[data-memset]').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  MS.set=btn.dataset.memset; memInit();
}));
$('mem-new').addEventListener('click',memInit);
$('mem-win-new').addEventListener('click',()=>{ $('memory-win').classList.add('hidden'); memInit(); });

/* ══════════════════════════════════════════════════════
    ██████╗ ██╗   ██╗██╗███████╗
   ██╔═══██╗██║   ██║██║╚══███╔╝
   ██║   ██║██║   ██║██║  ███╔╝
   ██║▄▄ ██║██║   ██║██║ ███╔╝
   ╚██████╔╝╚██████╔╝██║███████╗
    ╚══▀▀═╝  ╚═════╝ ╚═╝╚══════╝
   ИГРА 3: ВИКТОРИНА
══════════════════════════════════════════════════════ */
const QUIZ_Q = [
  {cat:'🏙 Краеведение',e:'🏰',q:'В каком году был основан Петропавловск?',a:['1752','1812','1700','1850'],c:0,fact:'Петропавловск основан как военная крепость в 1752 году на реке Есиль.'},
  {cat:'🌿 Природа',e:'🦅',q:'Какая птица — символ Казахстана?',a:['Воробей','Беркут','Журавль','Сова'],c:1,fact:'Беркут изображён на флаге и гербе Казахстана как символ свободы и силы.'},
  {cat:'🎨 Традиции',e:'🎪',q:'Казахский весенний праздник называется...',a:['Курбан-айт','Наурыз','Масленица','Ұлытау'],c:1,fact:'Наурыз — праздник Нового года по казахскому народному календарю, 22 марта.'},
  {cat:'🏙 Краеведение',e:'🏛',q:'Главный парк Петропавловска — это...',a:['Парк Дружбы','Парк Победы','Парк Наурыз','Центральный'],c:1,fact:'Парк Победы посвящён героям Великой Отечественной войны, здесь горит Вечный огонь.'},
  {cat:'🌿 Природа',e:'🐆',q:'Какое животное на гербе Казахстана?',a:['Волк','Беркут','Лошадь','Барс'],c:1,fact:'На гербе Казахстана изображён беркут — символ прозорливости и благородства.'},
  {cat:'🎨 Традиции',e:'🏠',q:'Традиционный казахский переносной дом — это...',a:['Изба','Юрта','Вигвам','Шатёр'],c:1,fact:'Юрта — круглый дом из деревянного каркаса и войлока, символ казахской культуры.'},
  {cat:'🏙 Краеведение',e:'🌊',q:'Какая река течёт через Петропавловск?',a:['Есиль (Ишим)','Сырдарья','Иртыш','Урал'],c:0,fact:'Река Есиль (Ишим) — главная река города, берущая начало в Акмолинской области.'},
  {cat:'🎨 Традиции',e:'🎵',q:'Главный инструмент казахов — это...',a:['Балалайка','Домбра','Мандолина','Гусли'],c:1,fact:'Домбра — двухструнный щипковый инструмент, душа казахской музыки.'},
  {cat:'🌿 Природа',e:'🌾',q:'Как называется равнина, где расположен наш город?',a:['Тайга','Степь','Тундра','Пустыня'],c:1,fact:'Казахская степь — одна из крупнейших в мире, покрыта травой и ковылём.'},
  {cat:'🏙 Краеведение',e:'🎓',q:'Университет Петропавловска носит имя...',a:['Ломоносова','Абая','Козыбаева','Аль-Фараби'],c:2,fact:'Северо-Казахстанский университет имени Манаша Козыбаева — главный вуз города.'},
  {cat:'🎨 Традиции',e:'🥘',q:'Главное блюдо казахской кухни — это...',a:['Плов','Бешбармак','Шашлык','Самса'],c:1,fact:'Бешбармак — мясо с тестом, название означает «пять пальцев»: едят руками!'},
  {cat:'🌿 Природа',e:'🌸',q:'Символ весны в степях Казахстана — это...',a:['Роза','Тюльпан','Ромашка','Астра'],c:1,fact:'Тюльпан первым расцветает в степи весной. В Казахстане растёт более 35 видов.'},
  {cat:'🏙 Краеведение',e:'🎭',q:'Театр в Петропавловске основан в...',a:['1936','1950','1920','1945'],c:0,fact:'Северо-Казахстанский театр драмы имени Сабита Муканова — один из старейших в стране.'},
  {cat:'🎨 Традиции',e:'🏇',q:'Традиционная казахская игра на лошадях — это...',a:['Поло','Байга','Гандбол','Лапта'],c:1,fact:'Байга — скачки на лошадях, главное состязание казахских праздников.'},
,
  {cat:'🏙 Краеведение',e:'🌊',q:'Как называется река, на которой стоит Петропавловск?',a:['Ишим (Есиль)','Иртыш','Тобол','Урал'],c:0,fact:'Петропавловск стоит на реке Ишим — по-казахски Есиль.'},
  {cat:'🏙 Краеведение',e:'🗺',q:'Центром какой области является Петропавловск?',a:['Северо-Казахстанской','Акмолинской','Костанайской','Павлодарской'],c:0,fact:'Петропавловск — административный центр Северо-Казахстанской области (СКО).'},
  {cat:'🏙 Краеведение',e:'🤝',q:'С какой страной граничит СКО на севере?',a:['Россией','Китаем','Монголией','Кыргызстаном'],c:0,fact:'Северо-Казахстанская область граничит с Тюменской, Омской и Курганской областями России.'},
  {cat:'🏙 Краеведение',e:'🌾',q:'Чем знаменита Северо-Казахстанская область?',a:['Выращиванием пшеницы','Добычей нефти','Производством авто','Рыболовством'],c:0,fact:'СКО — главный зернопроизводящий регион Казахстана, «хлебная корзина» страны.'},
  {cat:'🌿 Природа',e:'❄️',q:'Какой климат у Петропавловска?',a:['Резко континентальный','Морской','Тропический','Субтропический'],c:0,fact:'Климат резко континентальный: жаркое лето и суровая зима (до −40°C).'},
  {cat:'🌿 Природа',e:'🌻',q:'Какой цветок — символ казахстанских степей?',a:['Тюльпан','Роза','Ромашка','Гвоздика'],c:0,fact:'Дикий тюльпан — символ весенних степей Казахстана. Каждую весну степи покрываются тюльпанами.'},
  {cat:'🎨 Традиции',e:'🏠',q:'Как называется традиционное жилище казахов?',a:['Юрта','Изба','Чум','Яранга'],c:0,fact:'Юрта — переносное жилище кочевников. Её можно собрать и разобрать за несколько часов.'},
  {cat:'🎨 Традиции',e:'🎵',q:'Главный традиционный инструмент казахов?',a:['Домбра','Балалайка','Гитара','Скрипка'],c:0,fact:'Домбра — главный музыкальный инструмент казахского народа. На ней исполняют кюи.'},
  {cat:'🎨 Традиции',e:'🍖',q:'Главное праздничное блюдо казахов?',a:['Бешбармак','Плов','Манты','Лагман'],c:0,fact:'Бешбармак — блюдо из мяса и теста. Едят руками — отсюда название «пять пальцев».'},
  {cat:'🎨 Традиции',e:'🌸',q:'Главный весенний праздник в Казахстане?',a:['Наурыз','Курбан-айт','Масленица','Ораза'],c:0,fact:'Наурыз — праздник весны, отмечается 22 марта. «Наурыз» означает «новый день».'},
  {cat:'🎨 Традиции',e:'🏇',q:'Как называются традиционные казахские скачки?',a:['Байга','Кокпар','Аударыспак','Курес'],c:0,fact:'Байга — традиционные скачки на длинные дистанции. Один из любимых национальных видов спорта.'},
  {cat:'🏙 Краеведение',e:'📚',q:'Имя какого поэта-просветителя носят улицы Петропавловска?',a:['Абай Кунанбаев','Пушкин','Лермонтов','Жамбыл'],c:0,fact:'Абай Кунанбаев (1845–1904) — великий казахский поэт и философ.'},
  {cat:'🎨 Традиции',e:'🌙',q:'Как называется священный месяц поста у мусульман?',a:['Рамадан','Наурыз','Шабан','Мухаррам'],c:0,fact:'Рамадан — девятый месяц исламского календаря. В этот месяц мусульмане соблюдают пост.'},
  {cat:'🏙 Краеведение',e:'🎓',q:'Когда в Казахстане отмечают День защиты детей?',a:['1 июня','1 января','9 мая','22 марта'],c:0,fact:'1 июня — Международный день защиты детей. Проводятся праздники и мероприятия для детей.'},
  {cat:'🌿 Природа',e:'🐺',q:'Какое животное — символ на гербе Казахстана?',a:['Тулпар (крылатый конь)','Волк','Орёл','Лев'],c:0,fact:'На гербе изображены крылья Тулпара — мифического крылатого коня — и шанырак юрты.'},
  {cat:'🌿 Природа',e:'🐟',q:'Какая рыба водится в реке Ишим?',a:['Щука','Осётр','Форель','Сёмга'],c:0,fact:'В Ишиме водятся щука, окунь, карась и лещ.'}
];

let QS = { qs:[], cur:0, score:0, streak:0, answered:false };

function quizInit() {
  QS.qs=shuffle(QUIZ_Q).slice(0,10); QS.cur=0; QS.score=0; QS.streak=0; QS.answered=false;
  $('quiz-score').textContent='0';
  $('quiz-finish-area').classList.add('hidden');
  $('quiz-question-area').classList.remove('hidden');
  const rec=Records.get('quiz');
  $('quiz-record').textContent=rec?'🏆 Рекорд: '+rec+'/10':'—';
  quizRender(); Audio.start();
}

function quizRender() {
  const q=QS.qs[QS.cur]; const total=QS.qs.length;
  QS.answered=false;
  $('quiz-progress').textContent=(QS.cur+1)+'/'+total;
  $('quiz-progress-fill').style.width=((QS.cur+1)/total*100)+'%';
  $('quiz-category-badge').textContent=q.cat;
  $('quiz-emoji-big').textContent=q.e;
  $('quiz-question-text').textContent=q.q;
  $('quiz-feedback').className='quiz-feedback hidden';
  $('quiz-fact-box').className='quiz-fact-box hidden';
  $('quiz-next-btn').classList.add('hidden');
  const emojis=['🅰','🅱','🅲','🅳'];
  const ans=$('quiz-answers'); ans.innerHTML='';
  q.a.forEach((txt,i)=>{
    const btn=document.createElement('button');
    btn.className='quiz-answer-btn';
    btn.innerHTML=`<span class="qa-emoji">${emojis[i]}</span><span>${txt}</span>`;
    btn.addEventListener('click',()=>quizAnswer(i));
    ans.appendChild(btn);
  });
}

async function quizAnswer(idx) {
  if(QS.answered) return;
  QS.answered=true;
  const q=QS.qs[QS.cur];
  const btns=qsa('.quiz-answer-btn');
  btns.forEach(b=>b.disabled=true);
  const fb=$('quiz-feedback');
  const fact=$('quiz-fact-box');
  if(idx===q.c){
    QS.score++; QS.streak++;
    $('quiz-score').textContent=QS.score;
    btns[idx].classList.add('correct');
    btns[idx].innerHTML+=' ✓';
    fb.textContent='✅ Правильно! Отлично!'; fb.className='quiz-feedback correct';
    Audio.correct();
    if(QS.streak>=3) toast('🔥 Серия: '+QS.streak+' правильных!','2000','combo');
    if(QS.streak>=5) await Achievements.unlock('quiz_5');
  } else {
    QS.streak=0;
    btns[idx].classList.add('wrong');
    btns[q.c].classList.add('correct');
    fb.textContent='❌ Нет. Правильно: «'+q.a[q.c]+'»'; fb.className='quiz-feedback wrong';
    Audio.wrong();
  }
  fact.textContent='💡 '+q.fact; fact.className='quiz-fact-box';
  $('quiz-next-btn').classList.remove('hidden');
}

$('quiz-next-btn').addEventListener('click',()=>{
  Audio.click(); QS.cur++;
  if(QS.cur>=QS.qs.length) quizFinish(); else quizRender();
});

async function quizFinish() {
  $('quiz-question-area').classList.add('hidden');
  $('quiz-finish-area').classList.remove('hidden');
  const s=QS.score,t=QS.qs.length,pct=s/t;
  const isNew=await Records.update('quiz',s,false);
  $('quiz-record').textContent='🏆 Рекорд: '+Records.get('quiz')+'/10';
  $('quiz-finish-emoji').textContent=pct>=0.9?'🏆':pct>=0.7?'🎉':pct>=0.5?'👍':'💪';
  $('quiz-finish-title').textContent=pct>=0.9?'Блестяще!':pct>=0.7?'Молодец!':pct>=0.5?'Хорошо!':'Продолжай!';
  $('quiz-finish-text').textContent=`Правильных ответов: ${s} из ${t}`;
  $('quiz-finish-stars').textContent=pct>=0.9?'⭐⭐⭐':pct>=0.7?'⭐⭐':'⭐';
  $('quiz-new-rec').style.display=isNew?'block':'none';
  if(s===10) await Achievements.unlock('quiz_master');
  Audio.bigWin();
}

$('quiz-restart').addEventListener('click',quizInit);
$('quiz-play-again').addEventListener('click',quizInit);

/* ══════════════════════════════════════════════════════
    ██████╗ █████╗ ███╗   ██╗██╗   ██╗ █████╗ ███████╗
   ██╔════╝██╔══██╗████╗  ██║██║   ██║██╔══██╗██╔════╝
   ██║     ███████║██╔██╗ ██║██║   ██║███████║███████╗
   ██║     ██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══██║╚════██║
   ╚██████╗██║  ██║██║ ╚████║ ╚████╔╝ ██║  ██║███████║
    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝
   ИГРА 4: РАСКРАСКА
══════════════════════════════════════════════════════ */
const PALETTE = [
  '#e74c3c','#c0392b','#e67e22','#d35400','#f1c40f','#f39c12',
  '#2ecc71','#27ae60','#1abc9c','#16a085','#3498db','#2980b9',
  '#9b59b6','#8e44ad','#e91e90','#ad1457',
  '#ffffff','#ecf0f1','#bdc3c7','#95a5a6',
  '#2c3e50','#1a252f','#000000','#c8a040',
];

const SCENES = [
  { label:'Юрта', emoji:'🏠', draw: drawYurta },
  { label:'Степь', emoji:'🌄', draw: drawStep },
  { label:'Орнамент', emoji:'🔷', draw: drawOrnament },
  { label:'Животные', emoji:'🐆', draw: drawAnimals },
  { label:'Петропавловск', emoji:'🏙', draw: drawCity },
];

function drawYurta(ctx,w,h) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#fffbf0'; ctx.fillRect(0,0,w,h);
  // Небо
  const sky=ctx.createLinearGradient(0,0,0,h*0.55);
  sky.addColorStop(0,'#87ceeb'); sky.addColorStop(1,'#c8e8f8');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.55); ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5; ctx.strokeRect(0,0,w,h*0.55);
  // Земля
  const gr=ctx.createLinearGradient(0,h*0.55,0,h);
  gr.addColorStop(0,'#8db85a'); gr.addColorStop(1,'#6a9a3a');
  ctx.fillStyle=gr; ctx.fillRect(0,h*0.55,w,h*0.45); ctx.strokeRect(0,h*0.55,w,h*0.45);
  // Стены юрты
  ctx.beginPath(); ctx.moveTo(w*0.1,h*0.72); ctx.lineTo(w*0.1,h*0.55); ctx.lineTo(w*0.9,h*0.55); ctx.lineTo(w*0.9,h*0.72); ctx.closePath();
  ctx.fillStyle='#f5e6c8'; ctx.fill(); ctx.strokeStyle='#8a6a30'; ctx.lineWidth=2; ctx.stroke();
  // Купол
  ctx.beginPath(); ctx.moveTo(w*0.1,h*0.55);
  ctx.bezierCurveTo(w*0.1,h*0.18,w*0.9,h*0.18,w*0.9,h*0.55);
  ctx.fillStyle='#e8d5a0'; ctx.fill(); ctx.stroke();
  // Шанырак
  ctx.beginPath(); ctx.arc(w/2,h*0.3,w*0.065,0,Math.PI*2);
  ctx.fillStyle='#c8a040'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(w/2,h*0.3,w*0.032,0,Math.PI*2);
  ctx.fillStyle='#fff'; ctx.fill(); ctx.stroke();
  // Укы (рейки купола)
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    ctx.beginPath(); ctx.moveTo(w/2,h*0.3);
    ctx.lineTo(w/2+Math.cos(angle)*w*0.38,h*0.55+Math.sin(angle)*0.05*h);
    ctx.strokeStyle='rgba(139,100,40,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  // Дверь
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(w*0.42,h*0.58,w*0.16,h*0.14,6) : ctx.rect(w*0.42,h*0.58,w*0.16,h*0.14);
  ctx.fillStyle='#c8853a'; ctx.fill(); ctx.strokeStyle='#6a3a10'; ctx.lineWidth=2; ctx.stroke();
  // Орнамент на стенах
  [w*0.22,w*0.5,w*0.78].forEach(x=>{
    ctx.beginPath(); ctx.arc(x,h*0.63,14,0,Math.PI*2);
    ctx.fillStyle='rgba(200,160,64,0.25)'; ctx.fill();
    ctx.strokeStyle='#c8a040'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-8,h*0.63); ctx.lineTo(x,h*0.63-8); ctx.lineTo(x+8,h*0.63); ctx.lineTo(x,h*0.63+8); ctx.closePath();
    ctx.strokeStyle='#c8a040'; ctx.lineWidth=1; ctx.stroke();
  });
  // Солнце
  ctx.beginPath(); ctx.arc(w*0.85,h*0.1,24,0,Math.PI*2);
  ctx.fillStyle='#ffe060'; ctx.fill(); ctx.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4; ctx.beginPath(); ctx.moveTo(w*0.85+Math.cos(a)*28,h*0.1+Math.sin(a)*28); ctx.lineTo(w*0.85+Math.cos(a)*36,h*0.1+Math.sin(a)*36); ctx.strokeStyle='#f0c000'; ctx.lineWidth=2; ctx.stroke();}
  // Трава
  for(let i=0;i<12;i++){
    const gx=w*0.05+i*w*0.085, gy=h*0.72;
    ctx.beginPath(); ctx.moveTo(gx,gy); ctx.quadraticCurveTo(gx+3,gy-14,gx+6,gy);
    ctx.strokeStyle='#4a8a2a'; ctx.lineWidth=1.5; ctx.stroke();
  }
}

function drawStep(ctx,w,h) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#f8f9fa'; ctx.fillRect(0,0,w,h);
  const sky=ctx.createLinearGradient(0,0,0,h*0.58);
  sky.addColorStop(0,'#4a90d0'); sky.addColorStop(1,'#8ec8f0');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.58); ctx.strokeStyle='#aac'; ctx.lineWidth=1; ctx.strokeRect(0,0,w,h*0.58);
  // Холмы
  ctx.beginPath(); ctx.moveTo(0,h*0.58);
  ctx.bezierCurveTo(w*0.15,h*0.35,w*0.3,h*0.5,w*0.45,h*0.42);
  ctx.bezierCurveTo(w*0.6,h*0.32,w*0.75,h*0.48,w*0.9,h*0.4);
  ctx.lineTo(w,h*0.45); ctx.lineTo(w,h*0.58); ctx.closePath();
  ctx.fillStyle='#7ab850'; ctx.fill(); ctx.strokeStyle='#5a9030'; ctx.stroke();
  // Степь
  const stepGr=ctx.createLinearGradient(0,h*0.58,0,h);
  stepGr.addColorStop(0,'#d8c870'); stepGr.addColorStop(1,'#c0a858');
  ctx.fillStyle=stepGr; ctx.fillRect(0,h*0.58,w,h*0.42); ctx.strokeStyle='#a09040'; ctx.strokeRect(0,h*0.58,w,h*0.42);
  // Облака
  [[w*0.2,h*0.12,1],[w*0.62,h*0.08,0.85]].forEach(([cx,cy,sc])=>{
    [[-22,0,22],[-14,0,14],[0,-10,0]].forEach(([dx,dy,r2])=>{
      ctx.beginPath(); ctx.arc(cx+dx*sc,cy+dy*sc,(r2||20)*sc,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fill(); ctx.strokeStyle='#ddd'; ctx.lineWidth=1; ctx.stroke();
    });
  });
  // Цветы
  ['#f1c40f','#e74c3c','#9b59b6','#e67e22','#2ecc71','#3498db'].forEach((c,i)=>{
    const fx=w*(0.08+i*0.16),fy=h*(0.68+Math.sin(i)*0.06);
    ctx.beginPath(); ctx.arc(fx,fy,9,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx,fy+9); ctx.lineTo(fx+2,fy+22);
    ctx.strokeStyle='#3a7a1a'; ctx.lineWidth=2; ctx.stroke();
  });
  // Орёл
  const ex=w*0.5,ey=h*0.2;
  ctx.beginPath();
  ctx.moveTo(ex,ey); ctx.bezierCurveTo(ex-30,ey-10,ex-55,ey+8,ex-45,ey+22);
  ctx.bezierCurveTo(ex-22,ey+28,ex,ey+8,ex,ey);
  ctx.bezierCurveTo(ex+22,ey+8,ex+45,ey+28,ex+45,ey+22);
  ctx.bezierCurveTo(ex+55,ey+8,ex+30,ey-10,ex,ey);
  ctx.fillStyle='#8b6520'; ctx.fill(); ctx.strokeStyle='#5a4010'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(ex,ey-16,12,0,Math.PI*2); ctx.fillStyle='#f8f0d0'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex-3,ey-12); ctx.lineTo(ex-16,ey-7); ctx.lineTo(ex-3,ey-8); ctx.fillStyle='#e8b000'; ctx.fill();
}

function drawOrnament(ctx,w,h) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#fffbf0'; ctx.fillRect(0,0,w,h);
  // Рамка двойная
  ctx.strokeStyle='#c8a040'; ctx.lineWidth=7; ctx.strokeRect(8,8,w-16,h-16);
  ctx.strokeStyle='#003366'; ctx.lineWidth=2; ctx.strokeRect(16,16,w-32,h-32);
  // Угловые украшения
  [[22,22],[w-22,22],[22,h-22],[w-22,h-22]].forEach(([cx,cy])=>{
    ctx.beginPath(); ctx.arc(cx,cy,12,0,Math.PI*2); ctx.fillStyle='#c8a040'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fillStyle='#fffbf0'; ctx.fill();
    ctx.strokeStyle='#003366'; ctx.lineWidth=1.5; ctx.stroke();
  });
  // Сетка ромбов
  const cols=5,rows=4,cw=(w-36)/cols,ch=(h-36)/rows;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const cx=18+cw*c+cw/2, cy=18+ch*r+ch/2;
    const rw=cw*0.4, rh=ch*0.4;
    // Внешний ромб
    ctx.beginPath(); ctx.moveTo(cx,cy-rh); ctx.lineTo(cx+rw,cy); ctx.lineTo(cx,cy+rh); ctx.lineTo(cx-rw,cy); ctx.closePath();
    ctx.strokeStyle='#003366'; ctx.lineWidth=2.5; ctx.stroke();
    // Внутренний ромб
    ctx.beginPath(); ctx.moveTo(cx,cy-rh*0.5); ctx.lineTo(cx+rw*0.5,cy); ctx.lineTo(cx,cy+rh*0.5); ctx.lineTo(cx-rw*0.5,cy); ctx.closePath();
    ctx.strokeStyle='#c8a040'; ctx.lineWidth=1.5; ctx.stroke();
    // Точки
    [[0,-rh*1.15],[rw*1.15,0],[0,rh*1.15],[-rw*1.15,0]].forEach(([dx,dy])=>{
      ctx.beginPath(); ctx.arc(cx+dx,cy+dy,3.5,0,Math.PI*2);
      ctx.fillStyle='#c8a040'; ctx.fill();
    });
    // Центральный крест
    ctx.beginPath(); ctx.moveTo(cx-5,cy); ctx.lineTo(cx+5,cy); ctx.moveTo(cx,cy-5); ctx.lineTo(cx,cy+5);
    ctx.strokeStyle='rgba(0,51,102,0.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  // Горизонтальные разделители
  [h*0.33,h*0.67].forEach(y=>{
    ctx.beginPath(); ctx.moveTo(20,y); ctx.lineTo(w-20,y);
    ctx.setLineDash([8,4]); ctx.strokeStyle='rgba(200,160,64,0.5)'; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([]);
  });
}

function drawAnimals(ctx,w,h) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#f0f8f0'; ctx.fillRect(0,0,w,h);
  // Небо
  const sky=ctx.createLinearGradient(0,0,0,h*0.5);
  sky.addColorStop(0,'#87ceeb'); sky.addColorStop(1,'#c8f0f8');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.5); ctx.strokeStyle='#aac'; ctx.lineWidth=1; ctx.strokeRect(0,0,w,h*0.5);
  // Горы
  ctx.beginPath(); ctx.moveTo(0,h*0.5);
  ctx.lineTo(w*0.18,h*0.25); ctx.lineTo(w*0.35,h*0.4);
  ctx.lineTo(w*0.55,h*0.2); ctx.lineTo(w*0.72,h*0.38);
  ctx.lineTo(w*0.88,h*0.28); ctx.lineTo(w,h*0.42);
  ctx.lineTo(w,h*0.5); ctx.closePath();
  ctx.fillStyle='#a0c888'; ctx.fill(); ctx.strokeStyle='#6a9050'; ctx.stroke();
  // Трава
  const grassGr=ctx.createLinearGradient(0,h*0.5,0,h);
  grassGr.addColorStop(0,'#8db85a'); grassGr.addColorStop(1,'#5a8a2a');
  ctx.fillStyle=grassGr; ctx.fillRect(0,h*0.5,w,h*0.5); ctx.strokeStyle='#4a7a1a'; ctx.strokeRect(0,h*0.5,w,h*0.5);
  // Солнце
  ctx.beginPath(); ctx.arc(w*0.1,h*0.12,26,0,Math.PI*2); ctx.fillStyle='#ffe060'; ctx.fill(); ctx.strokeStyle='#f0c000'; ctx.lineWidth=2; ctx.stroke();
  // Снежный барс
  const bx=w*0.28, by=h*0.55;
  ctx.beginPath(); ctx.ellipse(bx,by,68,36,0,0,Math.PI*2); ctx.fillStyle='#f0d890'; ctx.fill(); ctx.strokeStyle='#8a7a40'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.arc(bx+62,by-8,26,0,Math.PI*2); ctx.fillStyle='#f0d890'; ctx.fill(); ctx.stroke();
  // Уши
  [[bx+54,by-28,bx+60,by-44,bx+68,by-28],[bx+68,by-28,bx+76,by-42,bx+84,by-28]].forEach(([x1,y1,x2,y2,x3,y3])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.strokeStyle='#5a4a20'; ctx.lineWidth=2; ctx.stroke();
  });
  // Глаза
  [[bx+58,by-12],[bx+74,by-12]].forEach(([ex,ey])=>{ ctx.beginPath(); ctx.arc(ex,ey,5,0,Math.PI*2); ctx.fillStyle='#1a2a0a'; ctx.fill(); ctx.beginPath(); ctx.arc(ex+1,ey-1,1.5,0,Math.PI*2); ctx.fillStyle='white'; ctx.fill(); });
  ctx.beginPath(); ctx.arc(bx+66,by-3,4,0,Math.PI*2); ctx.fillStyle='#e08888'; ctx.fill(); ctx.stroke();
  // Пятна
  [[bx-20,by-12],[bx+8,by-18],[bx-38,by+4],[bx+2,by+10],[bx-22,by+14],[bx+20,by+6]].forEach(([px,py])=>{ ctx.beginPath(); ctx.ellipse(px,py,9,7,0.3,0,Math.PI*2); ctx.strokeStyle='rgba(100,80,0,0.5)'; ctx.lineWidth=1.5; ctx.stroke(); });
  // Хвост
  ctx.beginPath(); ctx.moveTo(bx-62,by+12); ctx.bezierCurveTo(bx-90,by,bx-100,by-30,bx-80,by-48);
  ctx.strokeStyle='#d4b060'; ctx.lineWidth=10; ctx.lineCap='round'; ctx.stroke();
  ctx.strokeStyle='rgba(100,80,0,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
  // Лапы
  [[bx-38,by+38],[bx-8,by+40],[bx+28,by+38],[bx+52,by+34]].forEach(([px,py])=>{ ctx.beginPath(); ctx.ellipse(px,py,13,9,0,0,Math.PI*2); ctx.fillStyle='#f0d890'; ctx.fill(); ctx.strokeStyle='#8a7a40'; ctx.lineWidth=1.5; ctx.stroke(); });
  // Беркут
  const ex2=w*0.75, ey2=h*0.22;
  ctx.beginPath(); ctx.moveTo(ex2,ey2);
  ctx.bezierCurveTo(ex2-26,ey2-8,ex2-48,ey2+8,ex2-40,ey2+20);
  ctx.bezierCurveTo(ex2-20,ey2+26,ex2,ey2+8,ex2,ey2);
  ctx.bezierCurveTo(ex2+20,ey2+8,ex2+40,ey2+26,ex2+40,ey2+20);
  ctx.bezierCurveTo(ex2+48,ey2+8,ex2+26,ey2-8,ex2,ey2);
  ctx.fillStyle='#8b6520'; ctx.fill(); ctx.strokeStyle='#5a4010'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(ex2,ey2-15,13,0,Math.PI*2); ctx.fillStyle='#f8f0d0'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex2-2,ey2-11); ctx.lineTo(ex2-15,ey2-6); ctx.lineTo(ex2-2,ey2-8); ctx.fillStyle='#e8a000'; ctx.fill();
  ctx.beginPath(); ctx.arc(ex2+4,ey2-18,3,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill();
}

function drawCity(ctx,w,h) {
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#f0f4f8'; ctx.fillRect(0,0,w,h);
  // Закат
  const sky2=ctx.createLinearGradient(0,0,0,h*0.55);
  sky2.addColorStop(0,'#ff7043'); sky2.addColorStop(0.5,'#ffb74d'); sky2.addColorStop(1,'#ffe082');
  ctx.fillStyle=sky2; ctx.fillRect(0,0,w,h*0.55); ctx.strokeStyle='#e8a030'; ctx.lineWidth=1; ctx.strokeRect(0,0,w,h*0.55);
  // Солнце закатное
  ctx.beginPath(); ctx.arc(w*0.5,h*0.55,38,0,Math.PI*2); ctx.fillStyle='rgba(255,200,0,0.8)'; ctx.fill();
  // Отражение в реке
  const riv=ctx.createLinearGradient(0,h*0.72,0,h);
  riv.addColorStop(0,'#6ab0d8'); riv.addColorStop(1,'#3a80a8');
  ctx.fillStyle=riv; ctx.fillRect(0,h*0.72,w,h*0.28); ctx.strokeStyle='#2a6088'; ctx.strokeRect(0,h*0.72,w,h*0.28);
  // Волны
  for(let i=0;i<4;i++){
    ctx.beginPath(); ctx.moveTo(0,h*(0.76+i*0.05));
    for(let x=0;x<w;x+=30) ctx.quadraticCurveTo(x+15,h*(0.76+i*0.05)-5,x+30,h*(0.76+i*0.05));
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  // Дома
  const buildings=[[w*0.05,h*0.35,w*0.1,h*0.37],[w*0.18,h*0.28,w*0.1,h*0.44],[w*0.32,h*0.22,w*0.12,h*0.5],
    [w*0.48,h*0.18,w*0.1,h*0.54],[w*0.62,h*0.25,w*0.12,h*0.47],[w*0.78,h*0.3,w*0.1,h*0.42],[w*0.9,h*0.38,w*0.08,h*0.34]];
  buildings.forEach(([x,y,bw,bh],i)=>{
    const cols2=['#c8d8e8','#b8c8d8','#a8b8c8','#d8c8b8','#c8b8a8','#d0c0b0','#c0d0e0'];
    ctx.fillStyle=cols2[i%cols2.length]; ctx.fillRect(x,y,bw,bh-y+h*0.72);
    ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1; ctx.strokeRect(x,y,bw,bh-y+h*0.72);
    // Окна
    for(let wr=0;wr<3;wr++) for(let wc=0;wc<2;wc++){
      const wx=x+bw*0.15+wc*bw*0.45, wy=y+(bh-y+h*0.72)*0.15+wr*(bh-y+h*0.72)*0.25;
      ctx.fillStyle=i%2===0?'rgba(255,220,100,0.8)':'rgba(180,220,255,0.7)';
      ctx.fillRect(wx,wy,bw*0.25,bh*0.12); ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.strokeRect(wx,wy,bw*0.25,bh*0.12);
    }
  });
  // Дорога
  ctx.fillStyle='#888'; ctx.fillRect(0,h*0.67,w,h*0.05);
  for(let i=0;i<10;i++){ ctx.fillStyle='#fff'; ctx.fillRect(i*w/10+w*0.05,h*0.69,w*0.06,4); }
  // Деревья
  [[w*0.14,h*0.64],[w*0.38,h*0.62],[w*0.7,h*0.64],[w*0.85,h*0.63]].forEach(([tx,ty])=>{
    ctx.beginPath(); ctx.arc(tx,ty-12,15,0,Math.PI*2); ctx.fillStyle='#2d6a2d'; ctx.fill(); ctx.strokeStyle='#1a4a1a'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#5a3010'; ctx.fillRect(tx-3,ty-2,6,14);
  });
}

let CS = { color:'#e74c3c', brushSize:18, eraser:false, scene:0, drawing:false, lastX:0, lastY:0 };

function colorInit() {
  const palette=$('color-palette'); palette.innerHTML='';
  PALETTE.forEach(c=>{
    const btn=document.createElement('div');
    btn.className='palette-color'+(c===CS.color?' selected':'');
    btn.style.cssText=`background:${c};${c==='#ffffff'?'border:3px solid #ccc':''}`;
    btn.title=c;
    btn.addEventListener('click',()=>{
      qsa('.palette-color').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected'); CS.color=c; CS.eraser=false;
      $('eraser-btn').classList.remove('active');
      Audio.click();
    });
    palette.appendChild(btn);
  });
  const thumbs=$('coloring-thumbs'); thumbs.innerHTML='';
  SCENES.forEach((s,i)=>{
    const btn=document.createElement('div');
    btn.className='coloring-thumb'+(i===0?' active':'');
    btn.innerHTML=`${s.emoji}<span>${s.label}</span>`;
    btn.addEventListener('click',()=>{
      qsa('.coloring-thumb').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); CS.scene=i; colorDraw(); Audio.click();
    });
    thumbs.appendChild(btn);
  });
  const canvas=$('color-canvas');
  colorDraw();
  const getPos=(e)=>{
    const rect=canvas.getBoundingClientRect();
    const scX=canvas.width/rect.width, scY=canvas.height/rect.height;
    const src=e.touches?e.touches[0]:e;
    return {x:(src.clientX-rect.left)*scX, y:(src.clientY-rect.top)*scY};
  };
  const startDraw=(e)=>{ CS.drawing=true; const p=getPos(e); CS.lastX=p.x; CS.lastY=p.y; paintAt(p.x,p.y); };
  const doDraw=(e)=>{
    if(!CS.drawing) return;
    const p=getPos(e);
    const ctx=canvas.getContext('2d');
    ctx.beginPath(); ctx.lineWidth=CS.brushSize; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle=CS.eraser?'#fffbf0':CS.color;
    ctx.moveTo(CS.lastX,CS.lastY); ctx.lineTo(p.x,p.y); ctx.stroke();
    CS.lastX=p.x; CS.lastY=p.y;
    if(Math.random()<0.15) Audio.paint();
  };
  const stopDraw=()=>{ CS.drawing=false; };
  canvas.addEventListener('mousedown',startDraw);
  canvas.addEventListener('mousemove',doDraw);
  canvas.addEventListener('mouseup',stopDraw);
  canvas.addEventListener('mouseleave',stopDraw);
  canvas.addEventListener('touchstart',e=>{e.preventDefault();startDraw(e);},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();doDraw(e);},{passive:false});
  canvas.addEventListener('touchend',stopDraw);
}

function paintAt(x,y) {
  const canvas=$('color-canvas'), ctx=canvas.getContext('2d');
  ctx.beginPath(); ctx.arc(x,y,CS.brushSize/2,0,Math.PI*2);
  ctx.fillStyle=CS.eraser?'#fffbf0':CS.color; ctx.fill();
}

function colorDraw() { const c=$('color-canvas'); SCENES[CS.scene].draw(c.getContext('2d'),c.width,c.height); }

$('brush-size').addEventListener('input',function(){ CS.brushSize=parseInt(this.value); $('brush-size-val').textContent=this.value; });
$('eraser-btn').addEventListener('click',()=>{ CS.eraser=!CS.eraser; $('eraser-btn').classList.toggle('active',CS.eraser); Audio.click(); });
$('color-clear').addEventListener('click',()=>{ colorDraw(); Audio.click(); toast('🗑 Холст очищен!'); });
$('color-save').addEventListener('click', async ()=>{
  const canvas=$('color-canvas'), link=document.createElement('a');
  link.download='Раскраска_Петропавловск.png'; link.href=canvas.toDataURL('image/png'); link.click();
  Audio.bigWin();
  await Achievements.unlock('first_color');
  toast('🎉 Сохранено в загрузки!','3000','success');
});
$('color-new').addEventListener('click',()=>{
  CS.scene=(CS.scene+1)%SCENES.length;
  qsa('.coloring-thumb').forEach((b,i)=>b.classList.toggle('active',i===CS.scene));
  colorDraw(); Audio.start();
});

/* ══════════════════════════════════════════════════════
   ███████╗ ██████╗ ██████╗ ████████╗
   ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝
   ███████╗██║   ██║██████╔╝   ██║
   ╚════██║██║   ██║██╔══██╗   ██║
   ███████║╚██████╔╝██║  ██║   ██║
   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
   ИГРА 5: СОРТИРОВКА
══════════════════════════════════════════════════════ */
const SORT_MODES = {
  seasons:{
    buckets:[{id:'spring',l:'Весна',e:'🌸'},{id:'summer',l:'Лето',e:'☀️'},{id:'autumn',l:'Осень',e:'🍂'},{id:'winter',l:'Зима',e:'❄️'}],
    items:[
      {e:'🌸',l:'Цветы',b:'spring'},{e:'🌱',l:'Росток',b:'spring'},{e:'🌧',l:'Дождь',b:'spring'},
      {e:'☀️',l:'Жара',b:'summer'},{e:'🏖',l:'Купание',b:'summer'},{e:'🍉',l:'Арбуз',b:'summer'},
      {e:'🍂',l:'Листья',b:'autumn'},{e:'🍄',l:'Грибы',b:'autumn'},{e:'🎃',l:'Тыква',b:'autumn'},
      {e:'❄️',l:'Снег',b:'winter'},{e:'⛄',l:'Снеговик',b:'winter'},{e:'🛷',l:'Санки',b:'winter'},
    ]
  },
  animals:{
    buckets:[{id:'wild',l:'Дикие',e:'🦁'},{id:'domestic',l:'Домашние',e:'🐄'}],
    items:[
      {e:'🐺',l:'Волк',b:'wild'},{e:'🦊',l:'Лиса',b:'wild'},{e:'🐗',l:'Кабан',b:'wild'},
      {e:'🦅',l:'Орёл',b:'wild'},{e:'🐻',l:'Медведь',b:'wild'},{e:'🦌',l:'Олень',b:'wild'},
      {e:'🐮',l:'Корова',b:'domestic'},{e:'🐑',l:'Овца',b:'domestic'},{e:'🐴',l:'Лошадь',b:'domestic'},
      {e:'🐓',l:'Курица',b:'domestic'},{e:'🐕',l:'Собака',b:'domestic'},{e:'🐈',l:'Кошка',b:'domestic'},
    ]
  },
  sizes:{
    buckets:[{id:'big',l:'Большой',e:'🔴'},{id:'small',l:'Маленький',e:'🔵'}],
    items:[
      {e:'🐘',l:'Слон',b:'big'},{e:'🦒',l:'Жираф',b:'big'},{e:'🏠',l:'Дом',b:'big'},
      {e:'🚌',l:'Автобус',b:'big'},{e:'⛵',l:'Яхта',b:'big'},{e:'🏔',l:'Гора',b:'big'},
      {e:'🐜',l:'Муравей',b:'small'},{e:'🐝',l:'Пчела',b:'small'},{e:'🐞',l:'Жук',b:'small'},
      {e:'🌸',l:'Цветок',b:'small'},{e:'🔑',l:'Ключ',b:'small'},{e:'💍',l:'Кольцо',b:'small'},
    ]
  },
  food:{
    buckets:[{id:'fruit',l:'Фрукты',e:'🍎'},{id:'veg',l:'Овощи',e:'🥦'}],
    items:[
      {e:'🍎',l:'Яблоко',b:'fruit'},{e:'🍊',l:'Апельсин',b:'fruit'},{e:'🍇',l:'Виноград',b:'fruit'},
      {e:'🍓',l:'Клубника',b:'fruit'},{e:'🍉',l:'Арбуз',b:'fruit'},{e:'🍌',l:'Банан',b:'fruit'},
      {e:'🥕',l:'Морковь',b:'veg'},{e:'🥦',l:'Брокколи',b:'veg'},{e:'🍅',l:'Помидор',b:'veg'},
      {e:'🧅',l:'Лук',b:'veg'},{e:'🥔',l:'Картошка',b:'veg'},{e:'🌽',l:'Кукуруза',b:'veg'},
    ]
  },
};

let SS = { mode:'seasons', correct:0, errors:0, total:0, dragItem:null };

function sortInit() {
  const mode=SORT_MODES[SS.mode];
  SS.correct=0; SS.errors=0; SS.dragItem=null;
  SS.total=mode.items.length;
  $('sort-correct').textContent='0'; $('sort-errors').textContent='0';
  $('sort-win').classList.add('hidden');
  const rec=Records.get('sort_'+SS.mode);
  $('sort-record').textContent=rec?'🏆 Рекорд: '+rec+' ошибки':'—';
  const pool=$('sort-pool'); pool.innerHTML='';
  shuffle(mode.items).forEach(item=>{
    const el=createSortItem(item); pool.appendChild(el);
  });
  const bucketsEl=$('sort-buckets'); bucketsEl.innerHTML='';
  mode.buckets.forEach(b=>{
    const el=document.createElement('div');
    el.className='sort-bucket'; el.dataset.bucketId=b.id;
    el.innerHTML=`<div class="sort-bucket-header">${b.e}</div><div class="sort-bucket-label">${b.l}</div><div class="sort-bucket-items" id="bucket-${b.id}"></div>`;
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over');});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');if(SS.dragItem)sortDrop(b.id);});
    el.addEventListener('click',()=>{if(SS.dragItem)sortDrop(b.id);});
    bucketsEl.appendChild(el);
  });
  Audio.start();
}

function createSortItem(item) {
  const el=document.createElement('div');
  el.className='sort-item'; el.dataset.bucket=item.b; el.dataset.emoji=item.e; el.draggable=true;
  el.innerHTML=`<span>${item.e}</span><span class="sort-item-label">${item.l}</span>`;
  el.addEventListener('dragstart',e=>{SS.dragItem=el;el.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
  el.addEventListener('dragend',()=>{el.classList.remove('dragging');SS.dragItem=null;});
  el.addEventListener('click',()=>{
    if(SS.dragItem===el){ SS.dragItem=null; el.classList.remove('selected'); }
    else { qsa('.sort-item.selected').forEach(e=>e.classList.remove('selected')); SS.dragItem=el; el.classList.add('selected'); Audio.click(); }
  });
  // Touch
  let touchStartX,touchStartY;
  el.addEventListener('touchstart',e=>{
    touchStartX=e.touches[0].clientX; touchStartY=e.touches[0].clientY;
    SS.dragItem=el; el.classList.add('selected');
  },{passive:true});
  el.addEventListener('touchend',e=>{
    const t=e.changedTouches[0];
    const dx=Math.abs(t.clientX-touchStartX), dy=Math.abs(t.clientY-touchStartY);
    if(dx>10||dy>10){
      const target=document.elementFromPoint(t.clientX,t.clientY);
      const bucket=target?target.closest('.sort-bucket'):null;
      if(bucket&&SS.dragItem){sortDrop(bucket.dataset.bucketId);}
      else{SS.dragItem=null;el.classList.remove('selected');}
    }
  },{passive:true});
  return el;
}

async function sortDrop(bucketId) {
  const item=SS.dragItem; if(!item) return;
  SS.dragItem=null;
  qsa('.sort-item.selected').forEach(e=>e.classList.remove('selected'));
  const correct=item.dataset.bucket===bucketId;
  const placed=document.createElement('div');
  placed.className='sort-item placed '+(correct?'placed-correct':'placed-wrong');
  placed.innerHTML=item.innerHTML;
  const bucketItems=$('bucket-'+bucketId);
  if(bucketItems) bucketItems.appendChild(placed);
  item.remove();
  if(correct){
    SS.correct++; $('sort-correct').textContent=SS.correct;
    Audio.correct();
    placed.style.animation='placed-pop 0.3s ease';
  } else {
    SS.errors++; $('sort-errors').textContent=SS.errors;
    Audio.wrong();
    setTimeout(()=>{
      placed.remove();
      const newItem=createSortItem({e:item.dataset.emoji, l:qs('.sort-item-label',item)||item.dataset.emoji, b:item.dataset.bucket});
      newItem.dataset.bucket=item.dataset.bucket;
      newItem.dataset.emoji=item.dataset.emoji;
      $('sort-pool').appendChild(newItem);
    },900);
    return;
  }
  if($('sort-pool').children.length===0){
    const isNew=await Records.update('sort_'+SS.mode,SS.errors);
    setTimeout(()=>{
      $('sort-record').textContent='🏆 Рекорд: '+Records.get('sort_'+SS.mode)+' ошибки';
      $('sort-win-title').textContent=SS.errors===0?'🏆 Идеально без ошибок!':'🎉 Всё разложено!';
      $('sort-win-text').textContent=`Правильно: ${SS.correct}. Ошибок: ${SS.errors}`;
      $('sort-win-newrec').style.display=isNew?'block':'none';
      $('sort-win').classList.remove('hidden');
      Audio.bigWin();
      if(SS.errors===0) await Achievements.unlock('sort_perfect');
    },500);
  }
}

qsa('[data-sortmode]').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('[data-sortmode]').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  SS.mode=btn.dataset.sortmode; sortInit();
}));
$('sort-new').addEventListener('click',sortInit);
$('sort-win-new').addEventListener('click',()=>{ $('sort-win').classList.add('hidden'); sortInit(); });

/* ══════════════════════════════════════════
   ОФЛАЙН ФИЛЬТРЫ
══════════════════════════════════════════ */
qsa('.ofilter').forEach(btn=>btn.addEventListener('click',()=>{
  Audio.click();
  qsa('.ofilter').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  const f=btn.dataset.filter;
  qsa('.ocard').forEach(c=>{
    const tags=c.dataset.tags||'';
    c.style.display=(f==='all'||tags.includes(f))?'flex':'none';
  });
}));

window.printCard=function(type){
  Audio.click();
  const CARDS = {
    loto:{title:'Лото «Животные Казахстана»',items:['🐺 Волк','🦅 Орёл','🐎 Лошадь','🐪 Верблюд','🦊 Лиса','🐻 Медведь','🦌 Олень','🐗 Кабан','🐆 Барс','🦢 Лебедь','🦔 Ёж','🐇 Заяц'],cols:4},
    bajga:{title:'Байга — степная скачка',items:['🏁 Цель: первым добраться до финиша','🎲 Бросай кубик — иди вперёд','⚡ Молния: пропусти ход','🌟 Звезда: иди вперёд на 3','🐎 Лошадь: скачи вдвойне','🔄 Стрелка: вернись назад'],cols:2},
    map:{title:'Карта Петропавловска',items:['🏛 Резиденция Абылай-хана','⛪ Собор Петра и Павла','🌳 Парк Победы','🎭 Русский театр','🏪 Центральный рынок','🏫 Педагогический колледж','🌉 Набережная Есиля','🏙 Площадь Конституции'],cols:2},
    svetofor:{title:'Светофор — цветные круги',items:['🔴 Красный — СТОП','🟡 Жёлтый — ВНИМАНИЕ','🟢 Зелёный — ИДИ','🚶 Пешеход','🚗 Машина','🚦 Светофор','🛑 Знак СТОП','⚠️ Осторожно'],cols:4},
    bazar:{title:'Деньги и ценники для базара',items:['💴 1 тенге','💵 5 тенге','💶 10 тенге','💷 20 тенге','💰 50 тенге','🏷 Яблоки — 50 тг/кг','🏷 Морковь — 30 тг/кг','🏷 Хлеб — 80 тг/шт'],cols:4},
    asyk:{title:'Правила Асыка',items:['🎯 Цель: выбить асыки соперника','⭕ Чик — маленький асык','🔵 Омпа — большой асык','1️⃣ Бросай с линии','2️⃣ Попал — берёшь асык','3️⃣ Промахнулся — ход сопернику','🏆 Больше всех асыков — победа','📏 Расстояние: 3-5 шагов'],cols:2},
    ornament:{title:'Казахские орнаменты — раскраска',items:['🔷 Қошқар мүйіз (рога барана)','🌀 Жүрек (сердце)','⭐ Шың (вершина)','🌸 Гүл (цветок)','🔺 Үш өрнек (тройной)','💎 Ромб (алмаз)','〰️ Толқын (волна)','🔶 Алтыбұрыш (шестиугольник)'],cols:2},
    hot_cold:{title:'Карточки «Горячо-Холодно»',items:['☀️ Лето — ГОРЯЧО','❄️ Зима — ХОЛОДНО','🍂 Осень — ТЕПЛО','🌸 Весна — ПРОХЛАДНО','🔥 Огонь — ГОРЯЧО','🧊 Лёд — ХОЛОДНО','☕ Чай — ТЁПЛЫЙ','🍦 Мороженое — ХОЛОДНОЕ'],cols:4},
  };
  const card = CARDS[type];
  if (!card) { toast('⚠ Карточка не найдена','2000','error'); return; }
  const win = window.open('','_blank','width=800,height=600');
  if (!win) { toast('⚠ Разрешите всплывающие окна','3000','error'); return; }
  const itemsHtml = card.items.map(item =>
    `<div style="border:2px solid #003366;border-radius:12px;padding:14px 10px;text-align:center;font-size:15px;font-weight:700;background:#f0f6ff;break-inside:avoid">${item}</div>`
  ).join('');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${card.title}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:24px;color:#003366;margin:0}
      h1{text-align:center;font-size:22px;margin-bottom:6px;color:#003366}
      .sub{text-align:center;font-size:12px;color:#888;margin-bottom:20px}
      .grid{display:grid;grid-template-columns:repeat(${card.cols},1fr);gap:12px}
      @media print{body{padding:12px}.grid{gap:8px}}
    </style>
  </head><body>
    <h1>🎮 ${card.title}</h1>
    <div class="sub">Педагогический портал СКО · Петропавловск</div>
    <div class="grid">${itemsHtml}</div>
    <script>setTimeout(()=>window.print(),400)<\/script>
  </body></html>`);
  win.document.close();
};

/* ══════════════════════════════════════════
   ТАБЛИЦА РЕКОРДОВ — кнопка показа
══════════════════════════════════════════ */
async function buildRecordsModal() {
  let modal=document.getElementById('records-modal');
  if(!modal){
    modal=document.createElement('div'); modal.id='records-modal';
    modal.innerHTML=`<div class="records-box">
      <button class="records-close" id="records-close">✕</button>
      <h2>🏆 Таблица рекордов</h2>
      <div id="records-list"><div style="text-align:center;padding:20px;color:#888">⏳ Загрузка...</div></div>
      <h2 style="margin-top:20px">🎖 Достижения</h2>
      <div id="achievements-list"></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('records-close').addEventListener('click',()=>modal.classList.remove('active'));
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('active'); });
  }
  // Reload fresh data from Supabase
  await Records.loadAll();
  await Achievements.loadAll();
  const rList=document.getElementById('records-list');
  const data=Records._cache;
  const recs=[
    ['puzzle_3','Пазл 3×3','ходов'],['puzzle_4','Пазл 4×4','ходов'],['puzzle_5','Пазл 5×5','ходов'],
    ['memory_animals','Память: Животные','ходов'],['memory_sights','Память: Достопримечательности','ходов'],
    ['quiz','Викторина','из 10'],
    ['sort_seasons','Сортировка: Сезоны','ошибок'],['sort_animals','Сортировка: Животные','ошибок'],
  ];
  rList.innerHTML=recs.map(([k,n,u])=>`
    <div class="rec-row">
      <span class="rec-name">${n}</span>
      <span class="rec-val">${data[k]!==undefined?'<strong>'+data[k]+'</strong> '+u:'—'}</span>
    </div>`).join('');
  const aList=document.getElementById('achievements-list');
  const unlocked=Array.from(Achievements._cache);
  aList.innerHTML=Object.entries(Achievements.defs).map(([id,def])=>`
    <div class="ach-row ${unlocked.includes(id)?'unlocked':'locked'}">
      <span class="ach-icon-sm">${def.icon}</span>
      <div><strong>${def.title}</strong><small>${def.desc}</small></div>
      ${unlocked.includes(id)?'<span class="ach-check">✓</span>':'<span class="ach-lock">🔒</span>'}
    </div>`).join('');
  modal.classList.add('active'); // show AFTER data loaded
}

document.getElementById('show-records-btn')?.addEventListener('click',()=>{ Audio.click(); buildRecordsModal(); });

/* ══════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ
══════════════════════════════════════════ */
// Load user's records & achievements from Supabase on page load
(async function(){
  await Records.loadAll();
  await Achievements.loadAll();
  setTimeout(()=>Audio.start(),300);
})();
window._gameInits={puzzleInit,memInit,quizInit,colorInit,sortInit};

})();
