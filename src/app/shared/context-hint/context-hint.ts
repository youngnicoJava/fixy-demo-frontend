import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  signal,
} from '@angular/core';
import { ContextHintService } from '../../core/services/context-hint.service';
@Component({
  selector: 'app-context-hint',
  standalone: true,
  template:
    '@if(visible()){<aside class="fx-contract"><div class="fx-hint"><div><strong>{{title}}</strong><p>{{text}}</p></div><button type="button" aria-label="Descartar aviso" (click)="dismiss()">×</button></div></aside>}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextHintComponent implements OnChanges {
  @Input({ required: true }) hintKey!: string;
  @Input() title = '';
  @Input({ required: true }) text!: string;
  private readonly hints = inject(ContextHintService);
  readonly visible = signal(false);
  ngOnChanges() {
    this.visible.set(this.hints.visible(this.hintKey));
  }
  dismiss() {
    this.hints.dismiss(this.hintKey);
    this.visible.set(false);
  }
}
