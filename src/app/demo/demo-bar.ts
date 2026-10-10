import { DemoConfirm } from './demo-confirm';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  AfterViewInit,
  DestroyRef,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { DemoStore } from './demo-store';
import { DEMO_PASSWORD, DEMO_USERS } from './demo-state';
@Component({
  selector: 'app-demo-bar',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<aside class="demo-bar" aria-label="Controles de demostración">
    <span
      ><strong>Demo interactiva</strong> — sin backend · datos ficticios y pagos simulados
      <a routerLink="/demo-info">Info</a></span
    >
    <div>
      <small>{{ auth.currentUser()?.fullName || 'Sin sesión' }}</small
      ><button type="button" (click)="enter('client')">Entrar como cliente</button
      ><button type="button" (click)="enter('worker')">Entrar como trabajador</button
      ><button type="button" (click)="reset()">Restablecer demo</button>
    </div>
    @if (error()) {
      <span role="alert">{{ error() }}</span>
    }
  </aside>`,
  styles: [
    `
      .demo-bar {
        position: relative;
        z-index: 1100;
        background: #192b30;
        color: #fff;
        padding: 10px 18px;
        font:
          12px/1.5 Inter,
          Arial,
          sans-serif;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .demo-bar a {
        color: white;
        text-decoration: underline;
        margin-left: 6px;
      }
      .demo-bar div {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .demo-bar button {
        border: 1px solid #67858b;
        border-radius: 8px;
        background: #29484e;
        color: #fff;
        padding: 6px 10px;
        cursor: pointer;
      }
      .demo-bar button:hover {
        background: #365e66;
      }
      @media (max-width: 600px) {
        .demo-bar {
          padding: 8px 12px;
        }
        .demo-bar small {
          width: 100%;
        }
      }
    `,
  ],
})
export class DemoBarComponent implements AfterViewInit {
  private confirmation = inject(DemoConfirm);
  private host = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  ngAfterViewInit() {
    const resize = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        '--demo-bar-height',
        this.host.nativeElement.offsetHeight + 'px',
      ),
    );
    resize.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => resize.disconnect());
  }
  readonly auth = inject(AuthService);
  private store = inject(DemoStore);
  private router = inject(Router);
  readonly error = signal('');
  enter(role: 'client' | 'worker') {
    this.error.set('');
    this.auth.login({ email: DEMO_USERS[role], password: DEMO_PASSWORD }).subscribe({
      next: () => {
        void this.router.navigateByUrl('/home').then(() => location.reload());
      },
      error: () => this.error.set('No se pudo iniciar la sesión local.'),
    });
  }
  async reset() {
    if (!(await this.confirmation.ask('¿Restablecer todos los datos ficticios de este navegador?')))
      return;
    this.auth.logout();
    this.store.reset();
    for (const key of Object.keys(localStorage))
      if (key.startsWith('fixy-demo.favorites.') || key.startsWith('fixy.hints.'))
        localStorage.removeItem(key);
    void this.router.navigateByUrl('/home').then(() => location.reload());
  }
}
