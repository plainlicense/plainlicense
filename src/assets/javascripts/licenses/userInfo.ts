/**
 * @module userInfo
 *
 * @description
 * Manages license personalization — lets visitors fill in copyright holder,
 * year, and project name so the license reflects their actual project.
 *
 * Supports three input sources (highest priority first):
 *   1. postMessage from a parent frame  (embedded / iframe use-case)
 *   2. URL search params                (magic-link sharing)
 *   3. sessionStorage                   (persists for the current session)
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Plain License Team
 * @copyright No rights reserved.
 */

import {
  EMPTY,
  filter,
  fromEvent,
  map,
  merge,
  type Observable,
  Subject,
  Subscription,
  tap,
} from 'rxjs';
import { logger } from '../utils/log';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = 'plainlicense-user-info';
const PLACEHOLDER_ATTR = 'data-user-placeholder';
const PLACEHOLDER_CLASS = 'user-placeholder';
const FILLED_CLASS = 'user-placeholder--filled';
const PANEL_ID = 'user-info-panel';
const TRIGGER_ID = 'user-info-trigger';

/** URL param names used for magic links. */
const URL_PARAMS = {
  name: 'user-name',
  year: 'user-year',
  project: 'user-project',
} as const;

/** Text that marks a placeholder in the rendered license HTML. */
const PLACEHOLDER_TEXTS = [
  '[copyright holders]',
  '<copyright holders>',
  '[author]',
  '[your name]',
  '[organization]',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  /** Copyright holder name or organization */
  name: string;
  /** Copyright year, e.g. "2026" */
  year: string;
  /** Optional project / work name */
  projectName: string;
}

interface UserInfoMessage {
  type: 'userInfo';
  data: Partial<UserInfo>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUserInfoMessage(event: MessageEvent): event is MessageEvent<UserInfoMessage> {
  return (
    typeof event.data === 'object' &&
    event.data !== null &&
    event.data.type === 'userInfo' &&
    typeof event.data.data === 'object'
  );
}

function currentYear(): string {
  return String(new Date().getFullYear());
}

// ─── UserInfoManager ─────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of license personalization:
 *  - reads / writes to sessionStorage
 *  - reads URL params (magic link)
 *  - listens for postMessage (embedded frame)
 *  - injects a trigger button and form panel into the DOM
 *  - applies / reverts placeholder substitutions in the license text
 */
export class UserInfoManager {
  private info: UserInfo;
  private readonly change$ = new Subject<UserInfo>();
  public readonly subscription: Subscription;

  public constructor() {
    this.info = this.loadInfo();
    this.subscription = this.init();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Emits whenever the user saves new info. */
  public get changes$(): Observable<UserInfo> {
    return this.change$.asObservable();
  }

  /** Returns a copy of the currently stored UserInfo. */
  public getInfo(): UserInfo {
    return { ...this.info };
  }

  /** Apply info to DOM and save to session storage. */
  public applyInfo(info: Partial<UserInfo>): void {
    this.info = { ...this.info, ...info };
    this.saveInfo(this.info);
    this.applyToDOM(this.info);
    this.updateTriggerLabel();
    this.change$.next({ ...this.info });
  }

  /** Remove all placeholder substitutions and clear storage. */
  public clearInfo(): void {
    this.info = this.emptyInfo();
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // storage unavailable
    }
    this.revertDOM();
    this.updateTriggerLabel();
  }

  /** Clean up subscriptions and DOM elements. */
  public cleanup(): void {
    this.subscription?.unsubscribe();
    this.change$.complete();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(TRIGGER_ID)?.remove();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  private init() {
    this.markPlaceholders();
    this.injectTrigger();
    this.injectPanel();

    // Apply any info we already have (from session / URL / postMessage seed)
    if (this.hasInfo(this.info)) {
      this.applyToDOM(this.info);
      this.updateTriggerLabel();
    }

    return merge(
      this.watchPostMessage(),
      this.watchFormSubmit(),
      this.watchFormClear(),
      this.watchTrigger(),
    ).subscribe({
      error: (err) => logger.error('UserInfoManager error:', err),
    });
  }

  // ── Data loading / saving ─────────────────────────────────────────────────

  private emptyInfo(): UserInfo {
    return { name: '', year: currentYear(), projectName: '' };
  }

  private loadInfo(): UserInfo {
    const base = this.emptyInfo();

    // 1. sessionStorage
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserInfo>;
        Object.assign(base, parsed);
      }
    } catch {
      // storage unavailable or invalid JSON
    }

    // 2. URL params override storage (magic link takes precedence over session)
    const params = new URLSearchParams(window.location.search);
    const paramName = params.get(URL_PARAMS.name);
    const paramYear = params.get(URL_PARAMS.year);
    const paramProject = params.get(URL_PARAMS.project);

    if (paramName) base.name = paramName;
    if (paramYear) base.year = paramYear;
    if (paramProject) base.projectName = paramProject;

    return base;
  }

  private saveInfo(info: UserInfo): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(info));
    } catch {
      // storage unavailable
    }
  }

  private hasInfo(info: UserInfo): boolean {
    return info.name.trim().length > 0;
  }

  // ── DOM: placeholder marking ───────────────────────────────────────────────

  /**
   * Scans all `<code>` elements for known placeholder strings and wraps
   * their parent text node in a `<span data-user-placeholder="...">` so the
   * JS can find them reliably after MkDocs renders the markdown.
   */
  private markPlaceholders(): void {
    const codeEls = Array.from(document.querySelectorAll<HTMLElement>('code'));

    for (const el of codeEls) {
      const text = el.textContent ?? '';
      const matchedText = PLACEHOLDER_TEXTS.find((p) => text.includes(p));
      if (!matchedText) continue;

      // Don't mark the same element twice
      if (el.hasAttribute(PLACEHOLDER_ATTR)) continue;

      el.setAttribute(PLACEHOLDER_ATTR, 'holder');
      el.classList.add(PLACEHOLDER_CLASS);
      el.dataset['original'] = el.innerHTML;
    }

    // Also mark year values that sit adjacent to the holder placeholder.
    // Strategy: find paragraphs that contain a holder placeholder and look
    // for a 4-digit year pattern within them.
    const holderEls = Array.from(
      document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}="holder"]`),
    );
    for (const holderEl of holderEls) {
      const container = holderEl.closest('p, li, div');
      if (!container) continue;

      // Walk text nodes in the container to find a year
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const match = textNode.data.match(/\b(19|20)\d{2}\b/);
        if (!match) continue;

        // Don't mark a node that is already inside a placeholder span
        if ((textNode.parentElement as HTMLElement)?.hasAttribute(PLACEHOLDER_ATTR)) continue;

        const yearSpan = document.createElement('span');
        yearSpan.setAttribute(PLACEHOLDER_ATTR, 'year');
        yearSpan.classList.add(PLACEHOLDER_CLASS);
        yearSpan.dataset['original'] = match[0];
        yearSpan.textContent = match[0];

        // Replace the matched text node part with [before][span][after]
        const before = textNode.data.slice(0, match.index!);
        const after = textNode.data.slice(match.index! + match[0].length);
        const beforeNode = document.createTextNode(before);
        const afterNode = document.createTextNode(after);

        textNode.parentNode?.insertBefore(beforeNode, textNode);
        textNode.parentNode?.insertBefore(yearSpan, textNode);
        textNode.parentNode?.insertBefore(afterNode, textNode);
        textNode.parentNode?.removeChild(textNode);
        break; // one year per holder context is enough
      }
    }
  }

  // ── DOM: applying / reverting ──────────────────────────────────────────────

  private applyToDOM(info: UserInfo): void {
    if (!this.hasInfo(info)) return;

    const holders = Array.from(
      document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}="holder"]`),
    );
    for (const el of holders) {
      el.textContent = info.name;
      el.classList.add(FILLED_CLASS);
    }

    if (info.year) {
      const years = Array.from(
        document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}="year"]`),
      );
      for (const el of years) {
        el.textContent = info.year;
        el.classList.add(FILLED_CLASS);
      }
    }
  }

  private revertDOM(): void {
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(`[${PLACEHOLDER_ATTR}]`),
    );
    for (const el of all) {
      const original = el.dataset['original'];
      if (original !== undefined) {
        el.innerHTML = original;
      }
      el.classList.remove(FILLED_CLASS);
    }
  }

  // ── DOM: trigger button ────────────────────────────────────────────────────

  private injectTrigger(): void {
    // Don't inject on pages that have no placeholders
    if (!document.querySelector(`[${PLACEHOLDER_ATTR}]`)) return;
    if (document.getElementById(TRIGGER_ID)) return;

    const btn = document.createElement('button');
    btn.id = TRIGGER_ID;
    btn.type = 'button';
    btn.className = 'user-info-trigger md-button';
    btn.setAttribute('aria-controls', PANEL_ID);
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '✏️ Personalize';
    btn.title = 'Fill in your copyright information';

    // Insert into the secondary sidebar if it exists, otherwise into the content area
    const sidebar = document.getElementById('license-sidebar-inner');
    if (sidebar) {
      const wrapper = document.createElement('div');
      wrapper.className = 'md-nav md-nav--secondary user-info-trigger-wrapper';
      wrapper.appendChild(btn);
      sidebar.appendChild(wrapper);
    } else {
      const content = document.querySelector<HTMLElement>('.md-content__inner');
      content?.prepend(btn);
    }
  }

  private updateTriggerLabel(): void {
    const btn = document.getElementById(TRIGGER_ID);
    if (!btn) return;
    if (this.hasInfo(this.info)) {
      btn.textContent = `✏️ ${this.info.name}`;
      btn.title = 'Edit your copyright information';
    } else {
      btn.textContent = '✏️ Personalize';
      btn.title = 'Fill in your copyright information';
    }
  }

  // ── DOM: form panel ────────────────────────────────────────────────────────

  private injectPanel(): void {
    if (!document.querySelector(`[${PLACEHOLDER_ATTR}]`)) return;
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'user-info-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Personalize your license');
    panel.hidden = true;

    const hasProject = document.querySelector(`[${PLACEHOLDER_ATTR}="project"]`) !== null;

    panel.innerHTML = `
      <div class="user-info-panel__inner">
        <header class="user-info-panel__header">
          <h3 class="user-info-panel__title">Personalize Your License</h3>
          <button type="button" class="user-info-panel__close" aria-label="Close personalization panel">✕</button>
        </header>
        <p class="user-info-panel__description">
          Fill in your details below to preview this license with your copyright information.
          Your details are kept in this browser session only and never sent anywhere.
        </p>
        <form id="user-info-form" class="user-info-panel__form" novalidate>
          <div class="user-info-panel__field">
            <label for="user-info-name" class="user-info-panel__label">
              Copyright holder <span class="user-info-panel__required" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="user-info-name"
              name="name"
              class="user-info-panel__input"
              placeholder="Your name or organization"
              autocomplete="name"
              required
            />
            <span class="user-info-panel__hint">Your name, pen name, or organization name</span>
          </div>
          <div class="user-info-panel__field">
            <label for="user-info-year" class="user-info-panel__label">Year</label>
            <input
              type="number"
              id="user-info-year"
              name="year"
              class="user-info-panel__input user-info-panel__input--short"
              min="1900"
              max="2100"
              placeholder="${currentYear()}"
              autocomplete="off"
            />
            <span class="user-info-panel__hint">Defaults to the current year</span>
          </div>
          ${
            hasProject
              ? `<div class="user-info-panel__field">
              <label for="user-info-project" class="user-info-panel__label">Project name</label>
              <input
                type="text"
                id="user-info-project"
                name="projectName"
                class="user-info-panel__input"
                placeholder="Your project or work name"
                autocomplete="off"
              />
            </div>`
              : ''
          }
          <div class="user-info-panel__actions">
            <button type="submit" class="user-info-panel__btn user-info-panel__btn--primary md-button">
              Apply
            </button>
            <button type="button" class="user-info-panel__btn user-info-panel__btn--secondary md-button" id="user-info-clear">
              Clear
            </button>
          </div>
        </form>
        <p class="user-info-panel__copy-hint" aria-live="polite"></p>
      </div>
    `;

    document.body.appendChild(panel);
    this.prefillForm();
  }

  private prefillForm(): void {
    const form = document.getElementById('user-info-form') as HTMLFormElement | null;
    if (!form) return;
    const nameInput = form.querySelector<HTMLInputElement>('#user-info-name');
    const yearInput = form.querySelector<HTMLInputElement>('#user-info-year');
    const projectInput = form.querySelector<HTMLInputElement>('#user-info-project');
    if (nameInput && this.info.name) nameInput.value = this.info.name;
    if (yearInput && this.info.year) yearInput.value = this.info.year;
    if (projectInput && this.info.projectName) projectInput.value = this.info.projectName;
  }

  private showPanel(): void {
    const panel = document.getElementById(PANEL_ID);
    const trigger = document.getElementById(TRIGGER_ID);
    if (!panel) return;
    this.prefillForm();
    panel.hidden = false;
    panel.removeAttribute('hidden');
    trigger?.setAttribute('aria-expanded', 'true');
    // Focus first input
    (panel.querySelector<HTMLInputElement>('input'))?.focus();
  }

  private hidePanel(): void {
    const panel = document.getElementById(PANEL_ID);
    const trigger = document.getElementById(TRIGGER_ID);
    if (!panel) return;
    panel.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus();
  }

  // ── Observables ───────────────────────────────────────────────────────────

  private watchTrigger(): Observable<void> {
    const trigger = document.getElementById(TRIGGER_ID);
    if (!trigger) return EMPTY;

    return fromEvent(trigger, 'click').pipe(
      tap(() => {
        const panel = document.getElementById(PANEL_ID);
        if (panel?.hidden === false) {
          this.hidePanel();
        } else {
          this.showPanel();
        }
      }),
      map(() => void 0),
    );
  }

  private watchFormSubmit(): Observable<void> {
    return fromEvent<SubmitEvent>(document, 'submit').pipe(
      filter((ev) => (ev.target as HTMLElement)?.id === 'user-info-form'),
      tap((ev) => {
        ev.preventDefault();
        const form = ev.target as HTMLFormElement;
        const data = new FormData(form);
        const name = (data.get('name') as string | null)?.trim() ?? '';
        const year = (data.get('year') as string | null)?.trim() || currentYear();
        const projectName = (data.get('projectName') as string | null)?.trim() ?? '';
        if (!name) {
          const nameInput = form.querySelector<HTMLInputElement>('#user-info-name');
          nameInput?.focus();
          nameInput?.reportValidity();
          return;
        }
        this.applyInfo({ name, year, projectName });
        this.hidePanel();
        this.showCopyHint(name);
      }),
      map(() => void 0),
    );
  }

  private watchFormClear(): Observable<void> {
    return fromEvent<MouseEvent>(document, 'click').pipe(
      filter(
        (ev) =>
          (ev.target as HTMLElement)?.id === 'user-info-clear' ||
          (ev.target as HTMLElement)?.classList.contains('user-info-panel__close'),
      ),
      tap((ev) => {
        const id = (ev.target as HTMLElement).id;
        if (id === 'user-info-clear') {
          this.clearInfo();
        }
        this.hidePanel();
      }),
      map(() => void 0),
    );
  }

  private watchPostMessage(): Observable<void> {
    return fromEvent<MessageEvent>(window, 'message').pipe(
      filter(isUserInfoMessage),
      tap((event) => {
        logger.debug('UserInfo: received postMessage', event.data.data);
        this.applyInfo(event.data.data);
      }),
      map(() => void 0),
    );
  }

  // ── Copy hint ─────────────────────────────────────────────────────────────

  private showCopyHint(name: string): void {
    const hint = document.querySelector<HTMLElement>('.user-info-panel__copy-hint');
    if (!hint) return;
    hint.textContent = `✓ Applied — the license now shows "${name}" as the copyright holder.`;
    setTimeout(() => {
      hint.textContent = '';
    }, 5000);
  }
}
