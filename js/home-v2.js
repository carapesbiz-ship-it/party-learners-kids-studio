// Party Learners — Homepage v2 hero carousel
// Crossfades 4 core-experience slides via opacity only (compositor-safe, no layout shift).
// Auto-advances, pauses on interaction / hidden tab, swipeable, dot navigation,
// and respects prefers-reduced-motion (no autoplay, first slide shown).
(function () {
  const hero = document.querySelector('.hx-hero');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('.hx-slide'));
  const dots = Array.from(hero.querySelectorAll('.hx-dot'));
  if (slides.length < 2) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = parseInt(hero.getAttribute('data-autoplay'), 10) || 6500;

  let current = 0;
  let timer = null;

  function show(idx) {
    idx = (idx + slides.length) % slides.length;
    slides[current].classList.remove('is-active');
    dots[current] && dots[current].classList.remove('is-active');
    dots[current] && dots[current].setAttribute('aria-selected', 'false');
    current = idx;
    slides[current].classList.add('is-active');
    if (dots[current]) {
      dots[current].classList.add('is-active');
      dots[current].setAttribute('aria-selected', 'true');
    }
    // Promote the now-visible slide's image to eager so it never pops in late.
    const img = slides[current].querySelector('img');
    if (img && img.getAttribute('loading') === 'lazy') img.setAttribute('loading', 'eager');
  }

  function next() { show(current + 1); }

  function start() {
    if (reduce || timer) return;
    timer = window.setInterval(next, interval);
  }
  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }
  // Pause briefly after a manual interaction, then resume.
  function bump() { stop(); start(); }

  // Dot navigation
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { show(i); bump(); });
  });

  // Pause on hover / focus (desktop), resume on leave
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', start);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', start);

  // Pause when tab is hidden (saves work, avoids janky catch-up)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Swipe on touch devices
  let startX = null;
  hero.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (startX === null) { start(); return; }
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : show(current - 1); }
    startX = null;
    start();
  }, { passive: true });

  // Keyboard arrows when a dot has focus
  hero.querySelector('.hx-hero__dots').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); bump(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); bump(); }
  });

  start();
})();
