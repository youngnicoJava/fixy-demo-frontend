import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule, MessagesSquare } from 'lucide-angular';

@Component({
  selector: 'app-conversations-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './conversations-empty-state.html',
  styleUrl: './conversations-empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationsEmptyStateComponent {
  readonly icons = { MessagesSquare };
}
