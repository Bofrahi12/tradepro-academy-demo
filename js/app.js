// TradePro Academy — shared UI helpers
(function () {
  'use strict';

  // Toast
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // Reveal on scroll
  function initReveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  }

  // Accordion (event delegation)
  function initAccordion() {
    document.addEventListener('click', (e) => {
      const head = e.target.closest('.acc-head');
      if (!head) return;
      const item = head.closest('.acc-item');
      const body = item.querySelector('.acc-body');
      const open = item.classList.toggle('open');
      body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
    });
  }

  // Site header with auth state
  async function renderHeader(active) {
    const mount = document.getElementById('site-header');
    if (!mount) return;
    let user = null;
    try { user = await Store.me(); } catch { /* guest */ }
    const links = [
      ['/', 'الرئيسية'], ['/course', 'المنهج'],
    ];
    mount.innerHTML = `
      <div class="container">
        <a class="logo" href="index.html"><span class="logo-mark">T</span><span data-s="COURSE_NAME">TradePro Academy</span></a>
        <nav class="nav-links">${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
          ${user && user.role === 'admin' ? '<a href="admin.html">لوحة الإدارة</a>' : ''}
          ${user && user.enrolled ? '<a href="student.html">منصتي</a>' : ''}
        </nav>
        <div class="header-actions">
          ${user
            ? `<span style="color:var(--muted);font-size:.9rem">مرحباً، ${esc(user.name.split(' ')[0])}</span>
               <button class="btn btn-ghost btn-sm" id="logout-btn">خروج</button>`
            : `<a class="btn btn-ghost btn-sm" href="login.html">دخول</a>
               <a class="btn btn-primary btn-sm" href="register.html">ابدأ الآن</a>`}
        </div>
      </div>`;
    const lo = document.getElementById('logout-btn');
    if (lo) lo.onclick = async () => { await Store.logout(); location.href = 'index.html'; };
    // apply course name from settings
    try {
      const s = await Store.settings();
      mount.querySelectorAll('[data-s="COURSE_NAME"]').forEach((el) => (el.textContent = s.COURSE_NAME || 'TradePro Academy'));
      document.title = document.title.replace('{{SEO_TITLE}}', s.SEO_TITLE || s.COURSE_NAME || '');
    } catch { /* ignore */ }
  }

  // Apply settings placeholders: elements with [data-s="KEY"]
  async function applySettings(extra) {
    try {
      const s = await Store.settings();
      document.querySelectorAll('[data-s]').forEach((el) => {
        const k = el.getAttribute('data-s');
        if (s[k] !== undefined && s[k] !== '') {
          if (el.tagName === 'IMG') el.src = s[k]; else el.textContent = s[k];
        }
      });
      // SEO
      if (s.SEO_TITLE) document.title = s.SEO_TITLE;
      const md = document.querySelector('meta[name="description"]');
      if (md && s.META_DESCRIPTION) md.setAttribute('content', s.META_DESCRIPTION);
      if (extra) extra(s);
      return s;
    } catch (e) { if (extra) extra({}); return {}; }
  }

  // Video embed by provider
  function videoEmbed(provider, url) {
    if (!url) return `<div class="video-empty"><div><div style="font-size:2.4rem;margin-bottom:10px">🎬</div><p>سيتم إضافة فيديو هذا الدرس قريباً.</p></div></div>`;
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (provider === 'youtube' || yt) {
      const id = yt ? yt[1] : url;
      return `<iframe src="https://www.youtube.com/embed/${id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    }
    if (provider === 'vimeo' || vm) {
      const id = vm ? vm[1] : url;
      return `<iframe src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    }
    if (provider === 'cloudflare') {
      return `<iframe src="${esc(url)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    }
    return `<video controls preload="metadata" src="${esc(url)}"></video>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtPrice(s, key) {
    const cur = s.CURRENCY || '$';
    const v = s[key] || '0';
    return `${v} ${cur}`;
  }

  // JSON-LD Course schema
  function courseSchema(s, modules) {
    const data = {
      '@context': 'https://schema.org', '@type': 'Course',
      name: s.COURSE_NAME, description: s.COURSE_DESCRIPTION || s.META_DESCRIPTION,
      provider: { '@type': 'Organization', name: s.COURSE_NAME, sameAs: location.origin },
    };
    if (modules && modules.length) {
      data.hasCourseInstance = {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: `PT${modules.reduce((a, m) => a + m.lessons.length, 0)}H`,
      };
    }
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }

  function requireLoginRedirect() {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = '/login?next=' + next;
  }

  window.App = { toast, initReveal, initAccordion, renderHeader, applySettings, videoEmbed, esc, fmtPrice, courseSchema, requireLoginRedirect };
  document.addEventListener('DOMContentListener', () => { initReveal(); initAccordion(); });
})();

// ---- demo-only: resolve absolute app paths to relative demo pages ----
App.resolve = function (p) {
  if (!p) return null;
  if (/^(https?:|#|mailto:)/.test(p)) return p;
  const m = p.match(/^\/lesson\/(\d+)/); if (m) return 'lesson.html?id=' + m[1];
  const map = { '/': 'index.html', '/course': 'course.html', '/login': 'login.html',
    '/register': 'register.html', '/forgot': 'forgot.html', '/reset': 'reset.html',
    '/student': 'student.html', '/admin': 'admin.html' };
  const base = p.split('?')[0].split('#')[0];
  if (map[base]) return map[base] + p.slice(base.length);
  return p;
};
(function () {
  const _orig = App.requireLoginRedirect;
  App.requireLoginRedirect = function () {
    const next = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    location.href = 'login.html?next=' + next;
  };
})();
