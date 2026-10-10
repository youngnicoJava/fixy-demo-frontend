import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly message = signal<string | null>(null);

  readonly currentMessage = this.message.asReadonly();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, duration = 2400): void {
    this.message.set(message);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.message.set(null);
      this.timeoutId = null;
    }, duration);
  }

  hide(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.message.set(null);
  }
}
