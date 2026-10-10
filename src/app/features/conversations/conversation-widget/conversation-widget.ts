import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, X, ArrowRight, MessageCircle, ChevronUp } from 'lucide-angular';

import { ConversationService } from '../../../core/services/conversation.service';
import { ConversationSummaryResponse, conversationCounterpartName } from '../../../models/messaging.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conversation-widget',
  standalone: true,
  imports: [LucideAngularModule, CommonModule],
  templateUrl: './conversation-widget.html',
  styleUrl: './conversation-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationWidgetComponent {
  private readonly conversationService = inject(ConversationService);
  private readonly router = inject(Router);

  readonly icons = {
    MessageCircle,
    X,
    ArrowRight,
    ChevronUp,
  };

  // =========================================================
  // STATE
  // =========================================================

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly conversations = signal<ConversationSummaryResponse[]>([]);
  readonly error = signal<string | null>(null);

  // =========================================================
  // TRIGGER INPUTS (desde el padre)
  // =========================================================

  userName = input<string>('Mensajes');
  userOnline = input<boolean>(true);

  triggerName = computed(() => this.userName() || 'Mensajes');

  triggerInitial = computed(() => {
    const name = this.triggerName().trim();
    return name ? name.charAt(0).toUpperCase() : 'M';
  });

  triggerSubtitle = computed(() => {
    const unread = this.unreadCount();
    if (unread > 0) {
      return unread === 1 ? '1 mensaje sin leer' : `${unread} mensajes sin leer`;
    }
    return this.userOnline() ? 'En línea' : 'Desconectado';
  });

  // =========================================================
  // DERIVED
  // =========================================================

  readonly unreadCount = computed(
    () => this.conversations().filter((c) => this.isUnread(c)).length,
  );

  readonly hasConversations = computed(() => this.conversations().length > 0);

  // =========================================================
  // ACTIONS
  // =========================================================

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }

    this.open.set(true);
    this.loadConversations();
  }

  close(): void {
    this.open.set(false);
  }

  loadConversations(): void {
    this.loading.set(true);
    this.error.set(null);

    this.conversationService.getMyConversations().subscribe({
      next: (conversations) => {
        this.conversations.set(conversations);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar conversaciones:', error);
        this.error.set('No pudimos cargar tus mensajes.');
        this.loading.set(false);
      },
    });
  }

  openConversation(conversation: ConversationSummaryResponse): void {
    this.router.navigate(['/conversations', conversation.conversationId]);
    this.close();
  }

  openAllConversations(): void {
    this.router.navigate(['/conversations']);
    this.close();
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getCounterpartName(conversation: ConversationSummaryResponse): string {
    return conversationCounterpartName(conversation.counterpart);
  }

  getPreview(conversation: ConversationSummaryResponse): string {
    const message = conversation.lastMessage;
    if (!message) return 'Todavía no hay mensajes';
    return message.content;
  }

  isUnread(_conversation: ConversationSummaryResponse): boolean {
    return false;
  }

  getCounterpartPhotoUrl(conversation: ConversationSummaryResponse): string | null {
    return conversation.counterpart?.profilePhotoUrl ?? null;
  }

  getCounterpartInitial(conversation: ConversationSummaryResponse): string {
    const name = this.getCounterpartName(conversation)?.trim();
    return name ? name.charAt(0).toUpperCase() : '';
  }

  getAvatarClass(name: string): string {
    const colors = [
      'avatar-blue',
      'avatar-green',
      'avatar-purple',
      'avatar-orange',
      'avatar-pink',
      'avatar-teal',
    ];

    const safeName = (name ?? '').trim();
    if (!safeName) return 'avatar-blue';

    const hash = safeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  }

  //23/09/2026 helpers added
  getConversationContext(conversation: ConversationSummaryResponse): string {
    if (conversation.serviceOfferingId) {
      return `Publicación #${conversation.serviceOfferingId}`;
    }
    if (conversation.serviceRequestId) {
      return `Solicitud #${conversation.serviceRequestId}`;
    }
    return `Conversación #${conversation.conversationId}`;
  }

  getConversationContextClass(conversation: ConversationSummaryResponse): string {
    if (conversation.serviceOfferingId) return 'context-offering';
    if (conversation.serviceRequestId) return 'context-request';
    return 'context-default';
  }
}
