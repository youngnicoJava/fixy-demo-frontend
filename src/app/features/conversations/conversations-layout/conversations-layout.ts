import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConversationListComponent } from '../conversation-list/conversation-list';
import { ConversationComponent } from '../conversation/conversation';
import { ConversationsEmptyStateComponent } from '../conversations-empty-state/conversations-empty-state';

import { ConversationSummaryResponse } from '../../../models/messaging.model';

@Component({
  selector: 'app-conversations-layout',
  standalone: true,
  imports: [
    ConversationListComponent,
    ConversationComponent,
    ConversationsEmptyStateComponent,
  ],
  templateUrl: './conversations-layout.html',
  styleUrl: './conversations-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationsLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  //3.4 — referencia a la lista para refrescar cuando llega mensaje
  private readonly listRef =
    viewChild<ConversationListComponent>(ConversationListComponent);

  readonly activeConversationId = signal<number | null>(null);

  readonly hasActiveConversation = computed(
    () => this.activeConversationId() !== null,
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{const id=Number(params.get('id'));this.activeConversationId.set(Number.isInteger(id)&&id>0?id:null);});
  }

  onSelectConversation(conversation: ConversationSummaryResponse): void {
    this.activeConversationId.set(conversation.conversationId);

    this.router.navigate(['/conversations', conversation.conversationId], {
      replaceUrl: true,
    });
  }

  // 3.2 — volver (mobile)
  onBack(): void {
    this.activeConversationId.set(null);

    this.router.navigate(['/conversations'], { replaceUrl: true });
  }

  // 3.4 — refrescar lista cuando llega mensaje nuevo
  onMessageSent(): void {
    this.listRef()?.loadConversations();
  }
}