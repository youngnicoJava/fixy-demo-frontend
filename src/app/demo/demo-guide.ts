import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
  PLATFORM_ID,
  ElementRef,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemoStore } from './demo-store';
import { pageGuide } from './demo-guide-model';
@Component({
  selector: 'app-demo-guide',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--guide-top]':
      'navbarFixed() ? "calc(var(--fixy-navbar-height, 112px) + 16px)" : "16px"',
    '(document:keydown.escape)': 'closeOnEscape()',
  },
  template: `<button
      #guideToggle
      class="guide-toggle"
      type="button"
      (click)="hidden() ? reopen() : dismiss()"
      [attr.aria-expanded]="!hidden()"
      aria-controls="demo-guide-panel"
      [attr.aria-label]="
        hidden() ? 'Cómo usar esta pantalla · Abrir guía' : 'Cerrar guía de esta pantalla'
      "
    >
      <span aria-hidden="true">{{ hidden() ? '?' : '×' }}</span> Guía de demo
    </button>
    @if (!hidden()) {
      <aside id="demo-guide-panel" class="guide" aria-label="Guía interactiva de la demo">
        <div class="heading">
          <div>
            <span class="eyebrow">Guía de demo · sin backend</span>
            <h2>{{ guide().title }}</h2>
          </div>
          <button type="button" (click)="dismiss()" aria-label="Cerrar guía de esta pantalla">
            Cerrar guía
          </button>
        </div>
        <div class="instruction" aria-live="polite" aria-atomic="true">
          <p class="progress">Paso {{ index() + 1 }} de {{ guide().steps.length }}</p>
          <h3>{{ current().title }}</h3>
          <p>{{ current().text }}</p>
        </div>
        <div class="actions">
          <button type="button" (click)="previous()" [disabled]="index() === 0">Anterior</button
          ><button type="button" (click)="advance()">
            {{ index() < guide().steps.length - 1 ? 'Siguiente consejo' : 'Entendido' }}</button
          ><a routerLink="/demo-info">Info · qué es Fixy</a>
        </div>
        <small
          >Esta guía explica los pasos; las acciones se realizan en los controles de la
          pantalla.</small
        >
      </aside>
    }`,
  styles: [
    `
      :host {
        display: contents;
      }
      .guide-toggle {
        position: fixed;
        left: 16px;
        bottom: 20px;
        z-index: 1100;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        padding: 10px 16px;
        border: 1px solid #dcd6f5;
        border-radius: 14px;
        background: #24127a;
        color: white;
        box-shadow: 0 6px 20px #24127a24;
        font:
          600 14px/1.4 Inter,
          Arial,
          sans-serif;
        cursor: pointer;
      }
      .guide-toggle span {
        font-size: 22px;
        line-height: 1;
      }
      .guide {
        position: fixed;
        top: var(--guide-top, 16px);
        bottom: 84px;
        left: 16px;
        z-index: 1100;
        width: min(360px, calc(100vw - 32px));
        padding: 22px;
        box-sizing: border-box;
        overflow-y: auto;
        overscroll-behavior: contain;
        border: 1px solid #dcd6f5;
        border-radius: 16px;
        background: #f7f5ff;
        color: #24213c;
        box-shadow: 0 12px 36px #24127a26;
        font:
          14px/1.55 Inter,
          Arial,
          sans-serif;
      }
      .heading {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .eyebrow,
      .progress {
        font-size: 12px;
        color: #61558d;
      }
      .eyebrow {
        font-weight: 700;
      }
      h2 {
        margin: 4px 0 8px;
        font-size: 18px;
      }
      h3 {
        margin: 4px 0;
        font-size: 16px;
      }
      p {
        margin: 4px 0 10px;
      }
      .instruction {
        margin-top: 24px;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin: 20px 0 12px;
      }
      .guide button {
        min-height: 44px;
        padding: 7px 12px;
        border: 1px solid #b8acd9;
        border-radius: 9px;
        background: white;
        color: #3824ac;
        cursor: pointer;
        font: inherit;
      }
      button:disabled {
        opacity: 0.45;
        cursor: default;
      }
      button:focus-visible,
      a:focus-visible {
        outline: 3px solid #7462dd;
        outline-offset: 3px;
      }
      a {
        color: #3824ac;
        font-weight: 600;
      }
      .guide small {
        font-size: 11px;
        color: #6c6381;
      }
      @media (max-width: 640px) {
        .guide {
          left: 12px;
          width: min(360px, calc(100vw - 24px));
          padding: 18px;
        }
        .guide-toggle {
          left: 12px;
          bottom: 16px;
        }
      }
    `,
  ],
})
export class DemoGuideComponent {
  readonly navbarFixed = input(false);
  private readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = signal(this.router.url);
  private readonly dismissed = signal<Record<string, boolean>>(this.readDismissed());
  private readonly position = signal(0);
  readonly guide = computed(() => {
    this.store.revision();
    return pageGuide(this.url(), this.store.state);
  });
  private readonly opened = signal(false);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('guideToggle');
  readonly hidden = computed(() => !this.opened() || !!this.dismissed()[this.guide().key]);
  readonly index = computed(() => Math.min(this.position(), this.guide().steps.length - 1));
  readonly current = computed(() => this.guide().steps[this.index()]);
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.url.set((e as NavigationEnd).urlAfterRedirects));
    // Reset the explanation when navigation, role, or lifecycle changes its content.
    const content = computed(() => JSON.stringify(this.guide()));
    effect(() => {
      content();
      this.position.set(0);
    });
  }
  previous() {
    this.position.update((v) => Math.max(0, v - 1));
  }
  advance() {
    if (this.index() < this.guide().steps.length - 1) this.position.update((v) => v + 1);
    else this.dismiss();
  }
  closeOnEscape() {
    if (!this.hidden()) this.dismiss();
  }
  dismiss() {
    this.opened.set(false);
    this.toggleButton()?.nativeElement.focus();
    this.save(true);
  }
  reopen() {
    this.opened.set(true);
    this.position.set(0);
    this.save(false);
  }
  private readDismissed(): Record<string, boolean> {
    if (!this.browser) return {};
    try {
      return JSON.parse(localStorage.getItem('fixy.hints.demo-guide.v1') ?? '{}');
    } catch {
      return {};
    }
  }
  private save(value: boolean) {
    this.dismissed.update((v) => ({ ...v, [this.guide().key]: value }));
    if (this.browser) {
      try {
        localStorage.setItem('fixy.hints.demo-guide.v1', JSON.stringify(this.dismissed()));
      } catch {
        /* In-memory controls remain available. */
      }
    }
  }
}
