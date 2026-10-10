import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Wrench } from 'lucide-angular';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  // FIX 1: OnPush. Es seguro porque isLoading y errorMessage son signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly WrenchIcon = Wrench;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // FIX 2: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  // FIX 3: signal para loading.
  readonly isLoading = signal(false);

  // FIX 4: signal para el mensaje de error del backend.
  // El HTML lo usa con errorMessage().
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    // FIX 5: Validators.email en vez de minLength(3).
    // Un email de 3 caracteres no es un email valido.
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  onSubmit(): void {
    // FIX 6: guarda temprana contra doble submit.
    // El [disabled] del boton cubre el click, pero esto cubre Enter repetido.
    if (this.isLoading()) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    // FIX 7: limpiamos el error anterior antes de cada intento.
    this.errorMessage.set(null);

    const credentials = this.loginForm.getRawValue();

    // FIX 8: borrado el console.log(credentials) que exponia
    // email y password en la consola del navegador.
    this.authService
      .login(credentials)
      // FIX 9: evita actualizar estado si el componente se destruye
      // mientras el request esta en vuelo.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigateByUrl('/');
        },
        error: (error) => {
          this.isLoading.set(false);
          // FIX 10: mensaje visible para el usuario.
          // Antes solo hacia console.error y el usuario no veia nada,
          // por eso parecia que el boton "seguia cargando".
          this.errorMessage.set(
            error.status === 401
              ? 'Email o contrasena incorrectos'
              : 'Error al iniciar sesion. Intenta de nuevo.'
          );
        },
      });
  }
}