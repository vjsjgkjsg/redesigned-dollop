/**
 * session.js — Портал педагога СКО
 * Все сессии хранятся в Supabase, НЕ в localStorage
 * Подключать на всех страницах ПЕРВЫМ скриптом
 */

const SESSION = (() => {
  const SB_URL  = 'https://ljtogliylpubvkckpwyv.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdG9nbGl5bHB1YnZrY2twd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzEzODQsImV4cCI6MjA4ODc0NzM4NH0.91EQ_EEfi8X09Vm0jmH12_35R6tf0BwtTGoX3K5lgfc';
  const TOKEN_KEY  = 'psess_token'; // только токен в cookie/sessionStorage — не данные пользователя
  const SESSION_HOURS = 24;

  // ── Генерация токена ──
  function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // ── Supabase запрос ──
  async function sb(path, opts = {}) {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      headers: {
        'apikey': SB_ANON,
        'Authorization': 'Bearer ' + SB_ANON,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(opts.headers || {})
      },
      ...opts
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.message || r.statusText);
    }
    return r.json().catch(() => null);
  }

  // ── Сохранить токен (только токен — не данные!) ──
  function saveToken(token) {
    // sessionStorage — живёт пока вкладка открыта
    // localStorage — для "запомнить меня"
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  // ── Получить токен ──
  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  }

  // ── Удалить токен ──
  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // Очищаем старый SESSION_KEY тоже (миграция)
    localStorage.removeItem('pedagog_current_user');
    sessionStorage.removeItem('pedagog_current_user');
    sessionStorage.removeItem('admin_token');
  }

  // ── Создать сессию в Supabase после входа ──
  async function createSession(user) {
    const token = generateToken();
    const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
    await sb('user_sessions', {
      method: 'POST',
      body: JSON.stringify({
        token,
        user_id: user.id,
        login:   user.login,
        name:    user.name,
        role:    user.role || 'teacher',
        expires_at: expires
      })
    });
    saveToken(token);
    return token;
  }

  // ── Получить текущего пользователя из Supabase ──
  async function getUser() {
    const token = getToken();
    if (!token) return null;
    try {
      const rows = await sb(
        `user_sessions?token=eq.${token}&select=user_id,login,name,role,expires_at,last_active&limit=1`
      );
      if (!rows || !rows.length) { clearToken(); return null; }
      const sess = rows[0];
      // Проверяем срок
      if (new Date(sess.expires_at) < new Date()) {
        await destroySession();
        return null;
      }
      // Обновляем last_active (не ждём)
      sb(`user_sessions?token=eq.${token}`, {
        method: 'PATCH',
        body: JSON.stringify({ last_active: new Date().toISOString() })
      }).catch(() => {});
      return {
        id:    sess.user_id,
        login: sess.login,
        name:  sess.name,
        role:  sess.role
      };
    } catch(e) {
      return null;
    }
  }

  // ── Синхронная проверка токена (без запроса к БД) ──
  function hasToken() {
    return !!getToken();
  }

  // ── Уничтожить сессию (выход) ──
  async function destroySession() {
    const token = getToken();
    clearToken();
    if (token) {
      await sb(`user_sessions?token=eq.${token}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  // ── Миграция старых сессий из localStorage ──
  // Если есть старый SESSION_KEY — конвертируем
  async function migrate() {
    const old = localStorage.getItem('pedagog_current_user');
    if (!old || getToken()) return null;
    try {
      const user = JSON.parse(old);
      if (user?.id && user?.role) {
        // Создаём нормальную сессию в Supabase
        await createSession(user);
        localStorage.removeItem('pedagog_current_user');
        return user;
      }
    } catch(e) {}
    return null;
  }

  // ── Защита страницы — вызвать в начале каждой страницы ──
  async function guard(options = {}) {
    const {
      requireAuth  = true,   // нужна авторизация
      requireAdmin = false,  // нужна роль admin
      redirectTo   = 'auth.html', // куда редиректить если нет доступа
      adminPage    = false,  // это страница admin — обычных пользователей выгоняем
    } = options;

    // Попытка миграции старой сессии
    await migrate().catch(() => {});

    const user = await getUser();

    if (requireAuth && !user) {
      window.location.replace(redirectTo);
      return null;
    }

    if (requireAdmin && (!user || user.role !== 'admin')) {
      window.location.replace('index.html');
      return null;
    }

    // Если это НЕ admin страница и пользователь — admin → гоним на admin.html
    if (!adminPage && user && user.role === 'admin' && !window.location.search.includes('preview=1')) {
      window.location.replace('admin.html');
      return null;
    }

    return user;
  }

  return {
    createSession,
    getUser,
    hasToken,
    destroySession,
    clearToken,
    guard,
    migrate,
    generateToken,
  };
})();
