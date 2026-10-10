import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DemoGuideComponent } from './demo-guide';
import { DemoStore } from './demo-store';
import { DEMO_PASSWORD } from './demo-state';
describe('demo guide controls', () => {
  beforeEach(() => {
    localStorage.removeItem('fixy.hints.demo-guide.v1');
    TestBed.configureTestingModule({
      imports: [DemoGuideComponent],
      providers: [provideRouter([{ path: 'requests/:id', children: [] }])],
    });
    TestBed.inject(DemoStore).reset();
  });
  it('advances, remembers dismissal and can reopen without altering domain data', () => {
    const fixture = TestBed.createComponent(DemoGuideComponent);
    fixture.detectChanges();
    const guide = fixture.componentInstance,
      store = TestBed.inject(DemoStore);
    const before = JSON.stringify(store.state);
    expect(guide.hidden()).toBe(true);
    guide.reopen();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.guide-toggle').getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(fixture.nativeElement.querySelector('#demo-guide-panel')).not.toBeNull();
    guide.advance();
    expect(guide.index()).toBe(1);
    guide.dismiss();
    expect(guide.hidden()).toBe(true);
    expect(JSON.parse(localStorage.getItem('fixy.hints.demo-guide.v1')!)[guide.guide().key]).toBe(
      true,
    );
    fixture.destroy();
    const recreated = TestBed.createComponent(DemoGuideComponent);
    recreated.detectChanges();
    expect(recreated.componentInstance.hidden()).toBe(true);
    recreated.componentInstance.reopen();
    expect(recreated.componentInstance.hidden()).toBe(false);
    expect(recreated.componentInstance.index()).toBe(0);
    expect(JSON.stringify(store.state)).toBe(before);
  });
  it('updates payment guidance after a local transition without reloading', async () => {
    const store = TestBed.inject(DemoStore);
    await store.handle('POST', '/api/auth/login', {
      email: 'cliente@fixy.demo',
      password: DEMO_PASSWORD,
    });
    await TestBed.inject(Router).navigateByUrl('/requests/103');
    const fixture = TestBed.createComponent(DemoGuideComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.guide().steps[1].title).toBe('Simulá el pago');
    await store.confirmPayment(103);
    fixture.detectChanges();
    expect(fixture.componentInstance.guide().steps[1].title).toBe(
      'Iniciá el trabajo como profesional',
    );
  });
});
