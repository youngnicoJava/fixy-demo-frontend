import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
@Injectable({ providedIn: 'root' })
export class ContextHintService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private storageKey(key: string) {
    return 'fixy.hints.' + (this.auth.currentUser()?.id ?? 'anonymous') + '.' + key;
  }
  visible(key: string) {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      return localStorage.getItem(this.storageKey(key)) !== '1';
    } catch {
      return true;
    }
  }
  dismiss(key: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.storageKey(key), '1');
    } catch {
      /* The component still dismisses it for this visit. */
    }
  }
}
