import { ConversationStatus } from './enums/conversation-status.enum';
import { MessageStatus } from './enums/message-status.enum';
import { MessageType } from './enums/message-type.enum';

export interface ConversationCounterpartResponse {
  userId: number;
  name: string;
  surname: string;
  profilePhotoUrl: string | null;
}

export function conversationCounterpartName(
  counterpart: ConversationCounterpartResponse | null | undefined,
): string {
  return (
    [counterpart?.name, counterpart?.surname]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ') || 'Conversación'
  );
}

export interface ConversationResponse {
  id: number;

  serviceRequestId: number | null;
  serviceOfferingId: number | null;

  serviceOfferingTitle: string | null;
  currentUserIsClient: boolean;

  counterpart: ConversationCounterpartResponse;
  status: ConversationStatus;
  createdAt: string;
  closedAt: string | null;
}

export interface ConversationSummaryResponse {
  conversationId: number;
  serviceRequestId: number | null;
  serviceOfferingId: number | null;
  counterpart: ConversationCounterpartResponse;
  status: ConversationStatus;
  lastMessage: MessageResponse | null;
  updatedAt: string;
}

export interface MessageRequest {
  type?: MessageType;
  content: string;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
