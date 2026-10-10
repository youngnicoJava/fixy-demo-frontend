import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, Check } from 'lucide-angular';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  readonly icons = {
    Check,
  };
}
