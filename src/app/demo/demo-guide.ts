import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
  PLATFORM_ID,
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
  host: { '[style.padding-top]': 'navbarFixed() ? "var(--fixy-navbar-height, 112px)" : "0"' },
  template: `<section class="guide" aria-label="Guía interactiva de la demo">
    @if (hidden()) {
      <button class="reopen" type="button" (click)="reopen()">
        Cómo usar esta pantalla · Abrir guía
      </button>
    } @else {
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
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      .guide {
        margin: 16px auto 8px;
        padding: 18px 22px;
        border: 1px solid #dcd6f5;
        border-left: 4px solid #3824ac;
        border-radius: 16px;
        background: #f7f5ff;
        max-width: 1080px;
        width: calc(100% - 32px);
        box-sizing: border-box;
        color: #24213c;
        font:
          14px/1.55 Inter,
          Arial,
          sans-serif;
      }
      .heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
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
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin: 12px 0;
      }
      button {
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
      .reopen {
        border: 0;
        background: transparent;
        padding: 0;
      }
      .guide small {
        font-size: 11px;
        color: #6c6381;
      }
      @media (max-width: 640px) {
        .guide {
          padding: 14px;
          width: calc(100% - 24px);
        }
        .heading {
          flex-wrap: wrap;
        }
        h2 {
          font-size: 17px;
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
  readonly hidden = computed(() => !!this.dismissed()[this.guide().key]);
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
  dismiss() {
    this.save(true);
  }
  reopen() {
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
