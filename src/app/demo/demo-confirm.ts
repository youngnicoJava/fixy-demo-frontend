import { A11yModule } from '@angular/cdk/a11y';
import { Component, Injectable, inject, signal, ChangeDetectionStrategy } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class DemoConfirm {
  readonly text = signal<string | null>(null);
  private resolve: ((value: boolean) => void) | null = null;
  ask(text: string): Promise<boolean> {
    if (this.resolve) return Promise.resolve(false);
    this.text.set(text);
    return new Promise((resolve) => (this.resolve = resolve));
  }
  finish(value: boolean) {
    const resolve = this.resolve;
    this.resolve = null;
    this.text.set(null);
    resolve?.(value);
  }
}
@Component({
  selector: 'app-demo-confirm',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (dialog.text()) {
    <div class="demo-scrim">
      <section
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="dialog.finish(false)"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-confirm-title"
      >
        <h2 id="demo-confirm-title">Confirmación de demo</h2>
        <p>{{ dialog.text() }}</p>
        <div>
          <button type="button" (click)="dialog.finish(false)">Cancelar</button
          ><button type="button" (click)="dialog.finish(true)">Confirmar simulación</button>
        </div>
      </section>
    </div>
  }`,
  styles: [
    `
      .demo-scrim {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: #14271e80;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .demo-scrim section {
        background: white;
        color: #294b36;
        border-radius: 20px;
        padding: 28px;
        max-width: 460px;
        box-shadow: 0 16px 50px #0003;
      }
      .demo-scrim div div {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .demo-scrim button {
        padding: 12px 18px;
        border: 0;
        border-radius: 10px;
        background: #47745b;
        color: white;
        cursor: pointer;
      }
    `,
  ],
})
export class DemoConfirmComponent {
  readonly dialog = inject(DemoConfirm);
}
