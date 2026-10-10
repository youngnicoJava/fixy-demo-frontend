import { DemoGuideComponent } from './demo/demo-guide';
import { DemoConfirmComponent } from './demo/demo-confirm';
import { DemoBarComponent } from './demo/demo-bar';
import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthModal } from './shared/auth-modal/auth-modal';
import { AddressModal } from './shared/address-modal/address-modal';
import { ToastComponent } from './shared/components/toast/toast';
import { ConversationWidgetComponent } from './features/conversations/conversation-widget/conversation-widget';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DemoBarComponent,
    DemoGuideComponent,
    DemoConfirmComponent,
    RouterOutlet,
    NavbarComponent,
    AuthModal,
    AddressModal,
    ToastComponent,
    ConversationWidgetComponent,
  ],
  template: `
    <div class="app-container">
      <app-demo-bar /><app-demo-confirm />
      @if (showNavbar) {
        <app-navbar />
      }

      <app-demo-guide [navbarFixed]="showNavbar && !managedLayout()" />
      <main class="page-content" [class.managed-layout]="managedLayout()">
        <router-outlet />
      </main>

      @if (isAuthenticated() && showConversationWidget()) {
        <app-conversation-widget
          [userName]="currentUserName()"
          [userOnline]="currentUserOnline()"
        />
      }

      <app-auth-modal />
      <app-address-modal />
      <app-toast />
    </div>
  `,
  styles: [
    `
      .app-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .page-content {
        flex: 1;
        animation: fadeInUp 0.6s ease forwards;
      }

      .page-content.managed-layout {
        padding-top: var(--fixy-navbar-height, 112px);
        animation: none;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class App {
  showNavbar = true;
  readonly showConversationWidget = signal(true);
  readonly managedLayout = signal(false);

  private router = inject(Router);
  private authService = inject(AuthService);

  private hiddenRoutes = ['/login', '/register', '/become-worker'];

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;

        this.managedLayout.set(
          /^\/(dashboard(?:\/|$)|payments(?:[/?#]|$)|conversations(?:\/|$)|requests\/\d+(?:[/?#]|$)|services\/\d+(?:[/?#]|$))/.test(
            url,
          ),
        );
        this.showConversationWidget.set(
          !url.startsWith('/conversations') &&
            !url.startsWith('/payments') &&
            !/^\/requests\/\d+(?:[/?#]|$)/.test(url),
        );
        this.showNavbar = !this.hiddenRoutes.some((route) => url.startsWith(route));
      });
  }

  readonly isAuthenticated = computed(() => this.authService.currentUser() !== null);

  readonly currentUserName = computed(() => this.authService.currentUser()?.fullName ?? 'Mensajes');

  readonly currentUserOnline = computed(() => true);
}
