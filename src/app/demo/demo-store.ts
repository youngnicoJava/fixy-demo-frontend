import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { defer, from, map, catchError, throwError } from 'rxjs';
import { DemoEngine, DemoError } from './demo-engine';
@Injectable({ providedIn: 'root' })
export class DemoStore extends DemoEngine {
  readonly revision = signal(0);
  override handle(method: string, url: string, body: unknown = null): Promise<unknown> {
    return super.handle(method, url, body).finally(() => this.revision.update((v) => v + 1));
  }
  override confirmPayment(requestId: number) {
    return super.confirmPayment(requestId).finally(() => this.revision.update((v) => v + 1));
  }
  constructor() {
    super(isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage : undefined);
  }
}
// No next(): unknown requests fail explicitly instead of leaking to real services.
export const demoInterceptor: HttpInterceptorFn = (request) => {
  const store = inject(DemoStore);
  return defer(() => from(store.handle(request.method, request.urlWithParams, request.body))).pipe(
    map((body) => new HttpResponse({ status: 200, body, url: request.url })),
    catchError((error: unknown) =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: error instanceof DemoError ? error.status : 500,
            error: { message: error instanceof Error ? error.message : 'Error de demo' },
            url: request.url,
          }),
      ),
    ),
  );
};
