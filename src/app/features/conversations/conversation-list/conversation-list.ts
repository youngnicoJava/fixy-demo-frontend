import {
  ChangeDetectionStrategy, DestroyRef,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, MessageCircle, RefreshCw } from 'lucide-angular';

import { ConversationService } from '../../../core/services/conversation.service';
import { ConversationSummaryResponse, conversationCounterpartName } from '../../../models/messaging.model';
import { ConversationStatus } from '../../../models/enums/conversation-status.enum';
import { MessageType } from '../../../models/enums/message-type.enum';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [LucideAngularModule, CommonModule],
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationListComponent {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly conversationService = inject(ConversationService);

  readonly icons = {
    MessageCircle,
    RefreshCw,
  };

  // =========================================================
  // INPUT / OUTPUT
  // =========================================================

  @Input() activeId: number | null = null;

  @Output() select = new EventEmitter<ConversationSummaryResponse>();

  // =========================================================
  // STATE
  // =========================================================

  readonly conversations = signal<ConversationSummaryResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // 3.4 — IDs de conversaciones ya leídas (en memoria)
  private readonly readConversationIds = signal<Set<number>>(new Set());

  readonly hasConversations = computed(
    () => this.conversations().length > 0,
  );

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && !this.hasConversations(),
  );

  constructor() {
    this.loadConversations();
  }

  // =========================================================
  // ACTIONS
  // =========================================================

  loadConversations(): void {
    this.loading.set(true);
    this.error.set(null);

    this.conversationService.getMyConversations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (conversations) => {
        // 3.3 — orden más reciente primero
        const sorted = [...conversations].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        );

        this.conversations.set(sorted);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar conversaciones:', error);
        this.error.set('No pudimos cargar tus conversaciones.');
        this.loading.set(false);
      },
    });
  }

  onSelect(conversation: ConversationSummaryResponse): void {
    // 3.4 — marcar como leída al abrir
    this.markAsRead(conversation.conversationId);

    this.select.emit(conversation);
  }

  // =========================================================
  // 3.4 — UNREAD
  // =========================================================

  markAsRead(conversationId: number): void {
    this.readConversationIds.update((set) => {
      const next = new Set(set);
      next.add(conversationId);
      return next;
    });
  }

  isUnread(conversation: ConversationSummaryResponse): boolean {
    // Leída si la marcaste en esta sesión
    if (this.readConversationIds().has(conversation.conversationId)) {
      return false;
    }

    // Heurística sin backend: si el último mensaje NO es tuyo, es "no leída"
    // (cuando toques el backend, reemplazá esto por conversation.hasUnread)
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId || !conversation.lastMessage) {
      return false;
    }

    return conversation.lastMessage.senderId !== currentUserId;
  }

  private getCurrentUserId(): number | null {
    return this.authService.currentUser()?.id ?? null;
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getStatusLabel(status: ConversationStatus): string {
    return status === ConversationStatus.OPEN ? 'Activa' : 'Cerrada';
  }

  getStatusClass(status: ConversationStatus): string {
    return status === ConversationStatus.OPEN ? 'open' : 'closed';
  }

  getPreview(conversation: ConversationSummaryResponse): string {
  const message = conversation.lastMessage;

  if (!message) return 'Todavía no hay mensajes';

  return message.content;
}

  getCounterpartName(conversation: ConversationSummaryResponse): string {
    return conversationCounterpartName(conversation.counterpart);
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

    const hash = safeName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  }

  getConversationContext(
    conversation: ConversationSummaryResponse,
  ): string {
    if (conversation.serviceOfferingId) {
      return `Publicación #${conversation.serviceOfferingId}`;
    }
    if (conversation.serviceRequestId) {
      return `Solicitud #${conversation.serviceRequestId}`;
    }
    return `Conversación #${conversation.conversationId}`;
  }

  getConversationContextClass(
    conversation: ConversationSummaryResponse,
  ): string {
    if (conversation.serviceOfferingId) return 'context-offering';
    if (conversation.serviceRequestId) return 'context-request';
    return 'context-default';
  }

  formatDate(date: string): string {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return '';

    const now = new Date();

    const sameDay =
      value.getDate() === now.getDate() &&
      value.getMonth() === now.getMonth() &&
      value.getFullYear() === now.getFullYear();

    if (sameDay) {
      return value.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return value.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
    });
  }
}