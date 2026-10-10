import {
  ChangeDetectionStrategy, DestroyRef, Injector,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil, switchMap, map } from 'rxjs';
import { ContractPanelComponent } from '../../../shared/contract-panel/contract-panel';
import {
  LucideAngularModule,
  ArrowLeft,
  Send,
  Trash2,
  LockKeyhole,
  CornerDownRight
} from 'lucide-angular';

import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';
import { MessageService } from '../../../core/services/message.service';

import {
  ConversationResponse,
  conversationCounterpartName,
  MessageResponse,
  MessageRequest,
} from '../../../models/messaging.model';

import { ConversationStatus } from '../../../models/enums/conversation-status.enum';
import { MessageType } from '../../../models/enums/message-type.enum';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ContractPanelComponent],
  templateUrl: './conversation.html',
  styleUrl: './conversation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationComponent implements OnChanges {
  private readonly destroyRef=inject(DestroyRef);
  private readonly injector=inject(Injector);
  private readonly contextChanged=new Subject<void>();
  private readonly authService = inject(AuthService);
  private readonly conversationService = inject(ConversationService);
  private readonly messageService = inject(MessageService);

  readonly icons = {
    ArrowLeft,
    Send,
    Trash2,
    LockKeyhole,
    CornerDownRight
  };

  // =========================================================
  // INPUT / OUTPUT
  // =========================================================

  @Input({ required: true }) conversationId!: number;

  @Output() messageSent = new EventEmitter<MessageResponse>();
  @Output() back = new EventEmitter<void>();

  // =========================================================
  // VIEW CHILD (scroll al fondo)
  // =========================================================

  private readonly messagesEnd =
    viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  // =========================================================
  // STATE
  // =========================================================

  readonly conversation = signal<ConversationResponse | null>(null);
  readonly messages = signal<MessageResponse[]>([]);

  readonly messageText = signal('');

  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly deletingMessageId = signal<number | null>(null);
  readonly error = signal(false);

  readonly currentUserId = computed(
    () => this.authService.currentUser()?.id ?? null,
  );

  readonly isOpen = computed(
    () => this.conversation()?.status === ConversationStatus.OPEN,
  );

  readonly canSend = computed(
    () =>
      this.isOpen() &&
      this.messageText().trim().length > 0 &&
      !this.sending(),
  );

  readonly conversationTitle = computed(
    () => conversationCounterpartName(this.conversation()?.counterpart),
  );

readonly conversationContextMessage = computed(() => {
  const conversation = this.conversation();

  if (
    !conversation?.serviceOfferingId ||
    !conversation.serviceOfferingTitle
  ) {
    return null;
  }

  const title = conversation.serviceOfferingTitle.trim();

  if (!title) {
    return null;
  }

  if (conversation.currentUserIsClient) {
    return `Le enviaste un mensaje al profesional por la publicación "${title}".`;
  }

  return `El cliente respondió a tu publicación "${title}".`;
});

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['conversationId'] &&
      this.conversationId &&
      Number.isInteger(this.conversationId) &&
      this.conversationId > 0
    ) {
      this.loadConversation(this.conversationId);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  private loadConversation(conversationId: number): void {
    this.contextChanged.next(); this.loading.set(true);this.error.set(false);this.conversation.set(null);this.messages.set([]);this.messageText.set('');this.sending.set(false);this.deletingMessageId.set(null);
    this.conversationService.getConversation(conversationId).pipe(
      switchMap(conversation=>this.messageService.getMessages(conversationId).pipe(map(messages=>({conversation,messages})))),
      takeUntil(this.contextChanged),takeUntilDestroyed(this.destroyRef)
    ).subscribe({next:result=>{this.conversation.set(result.conversation);this.messages.set(result.messages);this.loading.set(false);this.scrollToBottom();},error:()=>{this.error.set(true);this.loading.set(false);}});
  }

  // =========================================================
  // 3.1 — SCROLL AL FONDO
  // =========================================================

  private scrollToBottom(): void {
    afterNextRender(() => {
      const el = this.messagesEnd()?.nativeElement;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }, {injector:this.injector});
  }

  // =========================================================
  // MESSAGE HELPERS
  // =========================================================

  isOwnMessage(message: MessageResponse): boolean {
    return message.senderId === this.currentUserId();
  }

  isDeletedMessage(message: MessageResponse): boolean {
    return message.deletedAt !== null;
  }

  // =========================================================
  // COMPOSER
  // =========================================================

  onMessageInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.messageText.set(input.value);
  }

  onMessageKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();

    if (this.canSend()) {
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.canSend()) return;

    const conversation = this.conversation();
    if (!conversation) return;

    const content = this.messageText().trim();
    if (!content) return;

    const request: MessageRequest = {
      type: MessageType.TEXT,
      content,
    };

    this.sending.set(true);

    this.messageService.sendMessage(conversation.id, request).pipe(takeUntil(this.contextChanged),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (message) => {
        this.messages.update((messages) => [...messages, message]);
        this.messageText.set('');
        this.sending.set(false);

        //3.1 — scroll al fondo también al enviar
        this.scrollToBottom();

        //3.4 — avisar al layout
        this.messageSent.emit(message);
      },
      error: () => {
        this.sending.set(false);
      },
    });
  }

  deleteMessage(message: MessageResponse): void {
    if (!this.isOwnMessage(message) || this.isDeletedMessage(message)) return;

    this.deletingMessageId.set(message.id);

    this.messageService.deleteMessage(message.id).pipe(takeUntil(this.contextChanged),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedMessage) => {
        this.messages.update((messages) =>
          messages.map((current) =>
            current.id === updatedMessage.id ? updatedMessage : current,
          ),
        );
        this.deletingMessageId.set(null);
      },
      error: () => {
        this.deletingMessageId.set(null);
      },
    });
  }

  // =========================================================
  // 3.2 — VOLVER (mobile)
  // =========================================================

  goBack(): void {
    this.back.emit();
  }

  // =========================================================
  // FORMATTERS
  // =========================================================

  formatMessageTime(date: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  formatMessageDate(date: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  trackByMessageId(_: number, message: MessageResponse): number {
    return message.id;
  }
}