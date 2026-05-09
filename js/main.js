// Party Learners Kids Studio — site script

// Header shrink-on-scroll — keeps the big centered logo prominent on initial load,
// then collapses to a compact sticky nav once the user scrolls past it.
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY > 80) header.classList.add('compact');
    else header.classList.remove('compact');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Mobile nav toggle
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close on link click (mobile)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Active nav highlighting based on current page (incl. dropdown items)
(function () {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const servicePages = ['divas-glam-spa-party.html','paint-boho-party.html','chef-party.html','party-themes.html'];
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const hrefBase = href.split('#')[0];
    if (hrefBase === path) a.classList.add('active');
  });
  // also highlight the Experiences dropdown toggle when on a service page
  if (servicePages.includes(path)) {
    const toggle = document.querySelector('.submenu-toggle');
    if (toggle) toggle.classList.add('active');
  }
})();

// Experiences dropdown — desktop hover (CSS) + click + keyboard accessibility
(function () {
  const toggles = document.querySelectorAll('.submenu-toggle');
  if (!toggles.length) return;

  toggles.forEach(toggle => {
    const submenu = toggle.nextElementSibling; // the .submenu UL
    if (!submenu) return;

    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
      // close any other open submenus first
      document.querySelectorAll('.submenu-toggle[aria-expanded="true"]').forEach(t => {
        if (t !== toggle) t.setAttribute('aria-expanded', 'false');
      });
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) close(); else open();
    });

    // keyboard: Enter / Space toggles, ArrowDown opens & focuses first item, Esc closes
    toggle.addEventListener('keydown', (e) => {
      const items = submenu.querySelectorAll('a');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open();
        if (items[0]) items[0].focus();
      } else if (e.key === 'Escape') {
        close();
        toggle.focus();
      }
    });

    submenu.addEventListener('keydown', (e) => {
      const items = Array.from(submenu.querySelectorAll('a'));
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[(idx + 1) % items.length];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        if (prev) prev.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
        toggle.focus();
      } else if (e.key === 'Tab') {
        // let tab move out, then close on next tick
        setTimeout(() => {
          if (!submenu.contains(document.activeElement) && document.activeElement !== toggle) close();
        }, 0);
      }
    });
  });

  // close all open submenus on outside click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.has-submenu')) return;
    document.querySelectorAll('.submenu-toggle[aria-expanded="true"]').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
    });
  });

  // close on Escape (global)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.submenu-toggle[aria-expanded="true"]').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Gallery filters
(function () {
  const filters = document.querySelectorAll('.gallery-filter');
  const items = document.querySelectorAll('.gallery-item');
  if (!filters.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      items.forEach(item => {
        const itemCat = item.dataset.category || '';
        if (cat === 'all' || itemCat.includes(cat)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
})();

// Contact form: Formspree handles delivery + redirect to /thank-you.html via _next.
// Lightweight client-side hook adds: (a) honeypot check on the "website" field, blocks silently if filled;
// (b) optional inline success message if the redirect is intercepted (e.g. AJAX in the future).
(function () {
  const form = document.getElementById('booking-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    // Honeypot: if "website" was filled, it's likely a bot. Cancel silently.
    const trap = form.querySelector('input[name="website"]');
    if (trap && trap.value && trap.value.trim() !== '') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Show success state immediately for better UX while Formspree processes.
    const success = document.getElementById('form-success');
    if (success) {
      // Delay slightly so the form actually posts before we visually confirm.
      setTimeout(() => success.classList.add('is-visible'), 50);
    }
  });
})();

// =========================
// Premium polish — scroll reveals + gallery lightbox
// Respects prefers-reduced-motion: skips observer, no lightbox transitions.
// =========================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Auto-decorate reveal targets + lazy-load gallery images
(function () {
  // Lazy-load all gallery images (skip if already set)
  document.querySelectorAll('.gallery-item img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });

  // Apply reveal markers — skip elements already in (or near) initial viewport
  // to avoid a flicker for above-the-fold content.
  const viewportSafeY = window.innerHeight * 0.85;
  const isAboveFold = (el) => el.getBoundingClientRect().top < viewportSafeY;

  const fadeSelectors = ['.section-head', '.feature-card', '.theme-card', '.review', '.cta-band'];
  const imageSelectors = ['.feature-block-visual', '.gallery-item'];

  fadeSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.hasAttribute('data-reveal')) return;
      if (isAboveFold(el)) return;
      el.setAttribute('data-reveal', 'fade');
    });
  });
  imageSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.hasAttribute('data-reveal')) return;
      if (isAboveFold(el)) return;
      el.setAttribute('data-reveal', 'image');
    });
  });

  // Stagger sibling cards within the same grid (max delay tier 5)
  ['.feature-card', '.theme-card', '.gallery-item', '.review'].forEach(sel => {
    const groups = new Map();
    document.querySelectorAll(sel).forEach(el => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      const idx = groups.get(parent);
      if (idx > 0) el.setAttribute('data-delay', String(Math.min(idx, 5)));
      groups.set(parent, idx + 1);
    });
  });
})();

// Scroll reveals via IntersectionObserver
(function () {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => io.observe(el));
})();

// Auto-decorate gallery items with view-icon (skip if already present)
(function () {
  const items = document.querySelectorAll('.gallery-item');
  if (!items.length) return;
  const iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
  items.forEach(item => {
    if (item.querySelector('.view-icon')) return;
    const span = document.createElement('span');
    span.className = 'view-icon';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = iconSvg;
    item.appendChild(span);
  });
})();

// Lightbox
(function () {
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const galleryImages = items
    .map(it => ({ item: it, img: it.querySelector('img') }))
    .filter(x => x.img);
  if (!galleryImages.length) return;

  // Build lightbox once
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML = `
    <button class="lightbox__btn lightbox__close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
    </button>
    <button class="lightbox__btn lightbox__prev" aria-label="Previous image">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button class="lightbox__btn lightbox__next" aria-label="Next image">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </button>
    <img class="lightbox__img" alt="" />
    <div class="lightbox__caption" aria-live="polite"></div>
  `;
  document.body.appendChild(lb);

  const imgEl = lb.querySelector('.lightbox__img');
  const captionEl = lb.querySelector('.lightbox__caption');
  const closeBtn = lb.querySelector('.lightbox__close');
  const prevBtn = lb.querySelector('.lightbox__prev');
  const nextBtn = lb.querySelector('.lightbox__next');

  let currentIdx = -1;
  let lastFocus = null;

  function open(idx) {
    if (idx < 0 || idx >= galleryImages.length) return;
    currentIdx = idx;
    const { img } = galleryImages[idx];
    imgEl.src = img.currentSrc || img.src;
    imgEl.alt = img.alt || '';
    captionEl.textContent = img.alt || '';
    captionEl.style.display = img.alt ? '' : 'none';
    lastFocus = document.activeElement;
    lb.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    currentIdx = -1;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(delta) {
    if (currentIdx < 0) return;
    const next = (currentIdx + delta + galleryImages.length) % galleryImages.length;
    open(next);
  }

  galleryImages.forEach(({ item }, idx) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      open(idx);
    });
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(idx);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
})();
