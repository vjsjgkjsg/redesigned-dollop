/**
 * security.js — Портал педагога СКО
 * Rate limiting, блокировка, лог входов
 * Подключать на auth.html и admin.html
 */

const SEC = (() => {
  // ── КОНСТАНТЫ ──
  const MAX_ATTEMPTS    = 5;    // попыток до блокировки
  const BLOCK_MINUTES   = 15;   // минут блокировки
  const WINDOW_MINUTES  = 10;   // окно для подсчёта попыток
  const MAX_PIN_FAST    = 3;    // быстрых PIN попыток (< 2 сек) до замедления

  // ── API BASE (через Netlify прокси если доступен, иначе прямо) ──
  const isNetlify = window.location.hostname !== 'localhost' && 
                    !window.location.hostname.includes('127.0.0.1') &&
                    !window.location.hostname.includes('file://');
  const DB_BASE = isNetlify ? '/api/db' : 
    'https://ljtogliylpubvkckpwyv.supabase.co/rest/v1';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdG9nbGl5bHB1YnZrY2twd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzEzODQsImV4cCI6MjA4ODc0NzM4NH0.91EQ_EEfi8X09Vm0jmH12_35R6tf0BwtTGoX3K5lgfc';

  // ── БРАУЗЕРНЫЙ FINGERPRINT (не IP, но уникален для браузера) ──
  function getFingerprint() {
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
    ].join('|');
    // Simple hash
    let h = 0;
    for (let i = 0; i < data.length; i++) {
      h = Math.imul(31, h) + data.charCodeAt(i) | 0;
    }
    return 'fp_' + Math.abs(h).toString(16);
  }

  // ── DEVICE INFO ──
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Компьютер';
    if (/Android/i.test(ua))     device = 'Android';
    else if (/iPhone/i.test(ua)) device = 'iPhone';
    else if (/iPad/i.test(ua))   device = 'iPad';
    else if (/Mobile/i.test(ua)) device = 'Телефон';

    let os = 'Неизвестно';
    if (/Windows NT 1[01]/i.test(ua))   os = 'Windows 10/11';
    else if (/Windows/i.test(ua))       os = 'Windows';
    else if (/Android ([\d.]+)/i.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/i)[1];
    else if (/iPhone OS ([\d_]+)/i.test(ua)) os = 'iOS ' + ua.match(/iPhone OS ([\d_]+)/i)[1].replace(/_/g,'.');
    else if (/Mac OS X/i.test(ua))      os = 'macOS';
    else if (/Linux/i.test(ua))         os = 'Linux';

    let browser = 'Браузер';
    if (/Chrome\/([\d]+)/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome ' + ua.match(/Chrome\/([\d]+)/i)[1];
    else if (/Firefox\/([\d]+)/i.test(ua)) browser = 'Firefox ' + ua.match(/Firefox\/([\d]+)/i)[1];
    else if (/Safari\/([\d]+)/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Edg\/([\d]+)/i.test(ua)) browser = 'Edge ' + ua.match(/Edg\/([\d]+)/i)[1];

    return { device, os, browser };
  }

  // ── SUPABASE ЗАПРОС ──
  async function dbReq(path, opts = {}) {
    const url = `${DB_BASE}/${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    // Прямой запрос — добавляем ключ; через прокси — ключ в netlify.toml
    if (!isNetlify) {
      headers['apikey'] = SB_ANON;
      headers['Authorization'] = 'Bearer ' + SB_ANON;
    }
    const r = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    return r.ok ? r.json().catch(() => null) : null;
  }

  // ── ПРОВЕРКА БЛОКИРОВКИ ──
  async function isBlocked(login) {
    try {
      const rows = await dbReq(
        `login_blocks?login=eq.${encodeURIComponent(login)}&select=blocked_until,attempt_count`
      );
      if (!rows || !rows.length) return null;
      const block = rows[0];
      const until = new Date(block.blocked_until);
      if (until > new Date()) {
        const mins = Math.ceil((until - new Date()) / 60000);
        return { blocked: true, until, mins, attempts: block.attempt_count };
      }
      // Блокировка истекла — удаляем
      await dbReq(`login_blocks?login=eq.${encodeURIComponent(login)}`, { method: 'DELETE' });
      return null;
    } catch(e) { return null; }
  }

  // ── ЗАПИСЬ ПОПЫТКИ ──
  async function recordAttempt(login, success, stage = 'password') {
    const { device, os, browser } = getDeviceInfo();
    try {
      await dbReq('login_attempts', {
        method: 'POST',
        body: JSON.stringify({
          login,
          ip_hint: getFingerprint(),
          success,
          stage,
          ua: navigator.userAgent.substring(0, 200),
          device: `${device} · ${os} · ${browser}`,
        })
      });
    } catch(e) {}
  }

  // ── ПОДСЧЁТ НЕУДАЧНЫХ ПОПЫТОК И БЛОКИРОВКА ──
  async function checkAndBlock(login) {
    try {
      const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
      const rows = await dbReq(
        `login_attempts?login=eq.${encodeURIComponent(login)}&success=eq.false&created_at=gte.${encodeURIComponent(since)}&select=id`
      );
      const count = (rows || []).length;

      if (count >= MAX_ATTEMPTS) {
        const until = new Date(Date.now() + BLOCK_MINUTES * 60000).toISOString();
        // Upsert блокировку
        await dbReq(
          `login_blocks?login=eq.${encodeURIComponent(login)}`,
          { method: 'DELETE' }
        );
        await dbReq('login_blocks', {
          method: 'POST',
          body: JSON.stringify({
            login,
            blocked_until: until,
            reason: 'too_many_attempts',
            attempt_count: count,
          })
        });
        return { blocked: true, mins: BLOCK_MINUTES, attempts: count };
      }

      return { blocked: false, attempts: count, remaining: MAX_ATTEMPTS - count };
    } catch(e) {
      return { blocked: false, attempts: 0, remaining: MAX_ATTEMPTS };
    }
  }

  // ── ЗАПИСЬ УСПЕШНОЙ СЕССИИ ──
  async function recordSession(userId, userName, login) {
    const { device, os, browser } = getDeviceInfo();
    try {
      await dbReq('login_sessions', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          login,
          device,
          os,
          browser,
          ip_hint: getFingerprint(),
        })
      });
      // Очищаем неудачные попытки после успешного входа
      await dbReq(
        `login_attempts?login=eq.${encodeURIComponent(login)}&success=eq.false`,
        { method: 'DELETE' }
      );
      // Снимаем блокировку если была
      await dbReq(`login_blocks?login=eq.${encodeURIComponent(login)}`, { method: 'DELETE' });
    } catch(e) {}
  }

  // ── LOCAL RATE LIMIT (защита без БД — localStorage) ──
  // Быстрая защита на клиенте пока запрос к БД идёт
  const LOCAL_KEY = 'sec_attempts';
  function localAttempts(login) {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return data[login] || { count: 0, lastAt: 0 };
  }
  function localFail(login) {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    const prev = data[login] || { count: 0, lastAt: 0 };
    data[login] = { count: prev.count + 1, lastAt: Date.now() };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    return data[login].count;
  }
  function localClear(login) {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    delete data[login];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }

  // ── PIN TIMING PROTECTION (замедление при быстром вводе) ──
  let _pinLastTime = 0;
  let _pinFastCount = 0;
  function pinDelay() {
    const now = Date.now();
    const delta = now - _pinLastTime;
    _pinLastTime = now;
    if (delta < 2000 && _pinLastTime > 0) {
      _pinFastCount++;
      if (_pinFastCount >= MAX_PIN_FAST) {
        return new Promise(r => setTimeout(r, 2000 + _pinFastCount * 500));
      }
    } else {
      _pinFastCount = 0;
    }
    return Promise.resolve();
  }

  // ── ПУБЛИЧНЫЙ API ──
  return {
    isBlocked,
    recordAttempt,
    checkAndBlock,
    recordSession,
    localFail,
    localClear,
    localAttempts,
    pinDelay,
    getDeviceInfo,
    getFingerprint,
    MAX_ATTEMPTS,
    BLOCK_MINUTES,
  };
})();
