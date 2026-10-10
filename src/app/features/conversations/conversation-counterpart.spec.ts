import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service';
import { ConversationListComponent } from './conversation-list/conversation-list';
import { ConversationWidgetComponent } from './conversation-widget/conversation-widget';
import { ConversationComponent } from './conversation/conversation';
import {
  ConversationCounterpartResponse,
  ConversationSummaryResponse,
  MessageResponse,
} from '../../models/messaging.model';
import { ConversationStatus } from '../../models/enums/conversation-status.enum';
import { MessageType } from '../../models/enums/message-type.enum';
import { MessageStatus } from '../../models/enums/message-status.enum';
import { Role } from '../../models/enums/Role.enum';
import { environment } from '../../../environments/environment';

describe('Conversation counterpart identity', () => {
  const client: ConversationCounterpartResponse = {
    userId: 101,
    name: 'José María',
    surname: 'Paz',
    profilePhotoUrl: null,
  };
  const worker: ConversationCounterpartResponse = {
    userId: 202,
    name: 'Luca',
    surname: 'Prodan',
    profilePhotoUrl: '/worker-photo.jpg',
  };

  for (const viewer of [client, worker]) {
    for (const sender of [client, worker, null]) {
      it(
        'shows the other participant in list, widget and header for viewer ' +
          viewer.userId +
          ' with last sender ' +
          (sender?.userId ?? 'none'),
        () => {
          const counterpart = viewer === client ? worker : client;
          const expectedName = counterpart.name + ' ' + counterpart.surname;
          TestBed.configureTestingModule({
            imports: [
              ConversationListComponent,
              ConversationWidgetComponent,
              ConversationComponent,
            ],
            providers: [
              provideRouter([]),
              provideHttpClient(),
              provideHttpClientTesting(),
              {
                provide: AuthService,
                useValue: {
                  currentUser: signal({
                    id: viewer.userId,
                    role: viewer === client ? Role.CLIENT : Role.WORKER,
                  }),
                },
              },
            ],
          });
          const http = TestBed.inject(HttpTestingController);
          const lastMessage: MessageResponse | null = sender
            ? {
                id: 1,
                conversationId: 7,
                senderId: sender.userId,
                senderName: sender.name + ' ' + sender.surname,
                content: 'Hola',
                type: MessageType.TEXT,
                status: MessageStatus.SENT,
                createdAt: '2026-10-05T00:00:00Z',
                updatedAt: '',
                deletedAt: null,
              }
            : null;
          const summary: ConversationSummaryResponse = {
            conversationId: 7,
            serviceRequestId: null,
            serviceOfferingId: 8,
            counterpart,
            status: ConversationStatus.OPEN,
            lastMessage,
            updatedAt: '2026-10-05T00:00:00Z',
          };
          const list = TestBed.createComponent(ConversationListComponent);
          http.expectOne(environment.apiUrl + '/conversations/my').flush([summary]);
          list.detectChanges();

          const widget = TestBed.createComponent(ConversationWidgetComponent);
          widget.componentInstance.toggle();
          http.expectOne(environment.apiUrl + '/conversations/my').flush([summary]);
          widget.detectChanges();

          const chat = TestBed.createComponent(ConversationComponent);
          chat.componentInstance.conversation.set({
            id: 7,
            serviceRequestId: null,
            serviceOfferingId: 8,
            serviceOfferingTitle: 'Plomería',
            currentUserIsClient: viewer === client,
            counterpart,
            status: ConversationStatus.OPEN,
            createdAt: '2026-10-05T00:00:00Z',
            closedAt: null,
          });
          chat.componentInstance.loading.set(false);
          chat.detectChanges();

          for (const fixture of [list, widget]) {
            expect(
              fixture.nativeElement.querySelector('.conversation-top strong').textContent.trim(),
            ).toBe(expectedName);
            const avatar = fixture.nativeElement.querySelector('.conversation-avatar');
            if (counterpart.profilePhotoUrl) {
              expect(avatar.querySelector('img').getAttribute('src')).toBe(
                counterpart.profilePhotoUrl,
              );
            } else {
              expect(avatar.querySelector('img')).toBeNull();
              expect(avatar.textContent.trim()).toBe('J');
            }
            expect(
              fixture.nativeElement.querySelector('.conversation-preview').textContent.trim(),
            ).toBe(sender ? 'Hola' : 'Todavía no hay mensajes');
          }
          expect(
            chat.nativeElement.querySelector('.conversation-heading h1').textContent.trim(),
          ).toBe(expectedName);
          http.verify();
          list.destroy();
          widget.destroy();
          chat.destroy();
        },
      );
    }
  }
});
