(function () {
  const cache = {};
  let resolvedBase = null;

  function getProjectRoot() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '/';
    return '/' + parts[0] + '/';
  }

  async function tryFetchLocale(base, lang) {
    try {
      const url = (base.endsWith('/') ? base : base + '/') + lang + '.json';
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function loadLocale(lang) {
    if (cache[lang]) return cache[lang];

    const projectRoot = getProjectRoot();
    const candidates = [
      './locales/',
      'locales/',
      '../locales/',
      '../../locales/',
      projectRoot + 'locales/',
      '/' + 'locales/'
    ];

    for (const base of candidates) {
      // debug log which path we're trying
      console.debug('i18n: trying base', base, 'for', lang);
      const data = await tryFetchLocale(base, lang);
      if (data) {
        resolvedBase = base.endsWith('/') ? base : base + '/';
        cache[lang] = data;
        console.info('i18n: loaded', lang, 'from', resolvedBase);
        return data;
      }
    }

    console.warn('i18n: locale not found for', lang);
    cache[lang] = {};
    return {};
  }

  function getKey(obj, key) {
    return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  async function applyTranslations(lang) {
    const t = await loadLocale(lang);
    let updated = 0;
    const missing = [];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = getKey(t, key);
      if (value !== undefined) { el.innerHTML = value; updated++; }
      else { missing.push(key); }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const value = getKey(t, key);
      if (value !== undefined) el.placeholder = value;
      else missing.push(key);
    });

    console.info(`i18n: applied ${updated} translations for lang=${lang}`);
    if (missing.length) console.debug('i18n: missing keys', [...new Set(missing)].slice(0,50));

    // Update button active state (simple visual cue)
    document.querySelectorAll('button[data-lang]').forEach(b => {
      if (b.dataset.lang === lang) b.classList.add('bg-primary', 'text-dark');
      else b.classList.remove('bg-primary', 'text-dark');
    });

    // update single toggle button text if exists
    const toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = lang.toUpperCase();

    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // attach handlers to language buttons (if present)
    document.querySelectorAll('button[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => applyTranslations(btn.dataset.lang));
    });

    // attach handler for single toggle button (project pages)
    const toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.lang || localStorage.getItem('lang') || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'id');
        const next = current === 'en' ? 'id' : 'en';
        applyTranslations(next);
      });
    }

    const saved = localStorage.getItem('lang') || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'id');
    applyTranslations(saved);
  });


  // helper for debugging
  window.setLanguage = async function (lang) { await applyTranslations(lang); };
})();