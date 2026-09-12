/**
 * Reveal-on-scroll: returns a callback ref. The element gets .is-revealed
 * the first time it enters the viewport (then is unobserved — reveal is
 * one-way). One shared IntersectionObserver serves every element.
 *
 * Safety net: a healthy observer fires immediately for every observe()
 * (with isIntersecting true or false). If no callback arrives shortly after
 * the first observe — broken/blocked observer — we reveal everything rather
 * than leave the page invisible.
 */
import { useCallback } from 'react';

let observer: IntersectionObserver | null = null;
let observerAlive = false;
let fallbackTimer: number | null = null;

function revealAll(): void {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-revealed'));
  observer?.disconnect();
  observer = null;
}

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        observerAlive = true;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
  }
  return observer;
}

export function useReveal(): (el: HTMLElement | null) => void {
  return useCallback((el) => {
    if (!el) return;
    const obs = getObserver();
    if (!obs) {
      el.classList.add('is-revealed');
      return;
    }
    obs.observe(el);

    if (!observerAlive && fallbackTimer === null) {
      fallbackTimer = window.setTimeout(() => {
        if (!observerAlive) revealAll();
      }, 1500);
    }
  }, []);
}
