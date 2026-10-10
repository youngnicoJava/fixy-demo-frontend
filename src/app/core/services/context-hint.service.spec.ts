import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ContextHintService } from './context-hint.service';
import { AuthService } from './auth.service';
import { ContextHintComponent } from '../../shared/context-hint/context-hint';
describe('Contextual hints', () => {
  const user = signal({ id: 777 });
  function setup(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    });
    return TestBed.inject(ContextHintService);
  }
  beforeEach(() => {
    user.set({ id: 777 });
    localStorage.removeItem('fixy.hints.777.quote_v1');
    localStorage.removeItem('fixy.hints.777.quote_v2');
    localStorage.removeItem('fixy.hints.778.quote_v1');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('dismissal persists across component visits while a new version can appear', () => {
    const service = setup();
    expect(service.visible('quote_v1')).toBe(true);
    service.dismiss('quote_v1');
    expect(service.visible('quote_v1')).toBe(false);
    expect(service.visible('quote_v2')).toBe(true);
  });
  it('another user does not inherit the dismissal', () => {
    const service = setup();
    service.dismiss('quote_v1');
    user.set({ id: 778 });
    expect(service.visible('quote_v1')).toBe(true);
  });
  it('server does not access browser storage', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SSR storage');
    });
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const service = setup('server');
    expect(service.visible('quote_v1')).toBe(false);
    service.dismiss('quote_v1');
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it('storage failure does not prevent dismissing the visible hint', () => {
    setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked storage');
    });
    const fixture = TestBed.createComponent(ContextHintComponent);
    fixture.componentRef.setInput('hintKey', 'quote_v1');
    fixture.componentRef.setInput('text', 'Test');
    fixture.detectChanges();
    fixture.componentInstance.dismiss();
    expect(fixture.componentInstance.visible()).toBe(false);
    fixture.destroy();
  });
});
