import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable, from, map, defer } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models/auth.model';
import { User } from '../../models/user.model';
import { DemoStore } from '../../demo/demo-store';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private store = inject(DemoStore);
  private currentUserSignal = signal<User | null>(
    this.store.state.users.find((u) => u.id === this.store.state.sessionId) ?? null,
  );
  readonly currentUser = this.currentUserSignal.asReadonly();
  private currentUserSubject = new BehaviorSubject<User | null>(this.currentUserSignal());
  readonly currentUser$ = this.currentUserSubject.asObservable();
  private version = 0;
  private authenticate(path: string, data: unknown): Observable<AuthResponse> {
    return defer(() => from(this.store.handle('POST', '/api/auth/' + path, data))).pipe(
      map((value) => {
        const response = value as AuthResponse;
        this.version++;
        this.currentUserSignal.set(response.user);
        this.currentUserSubject.next(response.user);
        return response;
      }),
    );
  }
  login(data: LoginRequest) {
    return this.authenticate('login', data);
  }
  register(data: RegisterRequest) {
    return this.authenticate('register', data);
  }
  logout() {
    this.store.state.sessionId = null;
    this.store.save();
    this.version++;
    this.currentUserSignal.set(null);
    this.currentUserSubject.next(null);
  }
  isAuthenticated() {
    return this.currentUserSignal() !== null;
  }
  getCurrentUser() {
    return this.currentUserSignal();
  }
  getAccessToken() {
    return this.isAuthenticated() ? 'demo-local-session' : null;
  }
  getSessionVersion() {
    return this.version;
  }
  refreshToken() {
    return this.authenticate('refresh', {});
  }
}
