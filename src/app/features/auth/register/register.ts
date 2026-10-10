import {
  Component,
  inject,
  signal,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule, Wrench } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import IntlTelInputComponent from '@intl-tel-input/angular';


import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

// FIX 1: helper puro para calcular fechas limite.
// Ya no hace falta ngOnInit para esto.
function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    IntlTelInputComponent,

  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  // FIX 2: OnPush. Ahora que currentStep y errorMessage son signals,
  // es seguro y reduce re-renders en cada tecla.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  // FIX 1: inicializadores de campo en vez de ngOnInit.
  readonly maxBirthDateObject = yearsAgo(18);
  readonly minBirthDateObject = yearsAgo(100);

  readonly WrenchIcon = Wrench;

  // FIX 3: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // FIX 2: signals en vez de propiedades planas.
  readonly currentStep = signal(1);
  readonly errorMessage = signal<string | null>(null);

  readonly turnstileSiteKey = environment.turnstileSiteKey;

  // FIX 4: phoneValid sigue siendo booleano porque viene de una libreria
  // externa, pero ahora esta respaldado por un validador custom en el form.
  phoneValid = true;

  // FIX 4: validador custom que lee phoneValid. Al ser arrow function,
  // conserva el this cuando lo llama FormBuilder.
  private readonly phoneValidator = (): ValidationErrors | null =>
    this.phoneValid ? null : { invalidPhone: true };

  // FIX 5: validador a nivel de grupo para comparar password y confirmPassword.
  // Se ejecuta solo cuando alguno de los dos cambia.
  private readonly passwordMatchValidator = (
    group: AbstractControl
  ): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;

    // Si confirmPassword esta vacio, dejamos que Validators.required se encargue.
    if (!confirm) return null;

    if (password !== confirm) {
      // Marcamos el error en confirmPassword para que el template lo muestre.
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  };

  readonly loadUtils = () => import('intl-tel-input/utils');

  readonly registerForm = this.fb.group(
    {
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/),
        ],
      ],
      surname: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      // FIX 4: phoneNumber ahora valida de verdad dentro del form.
      phoneNumber: ['', [Validators.required, this.phoneValidator]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/
          ),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      birthDate: [null as Date | null, Validators.required],
      captchaToken: ['demo-local', Validators.required],
      termsAccepted: [false, Validators.requiredTrue],
    },
    // FIX 5: validador a nivel de grupo.
    { validators: this.passwordMatchValidator }
  );

  // FIX 4: al cambiar la validez del telefono, forzamos revalidacion del control.
  onPhoneValidityChange(valid: boolean): void {
    this.phoneValid = valid;
    this.registerForm.controls.phoneNumber.updateValueAndValidity();
  }

  onCaptchaSuccess(token: string | null): void {
    this.registerForm.controls.captchaToken.setValue(token ?? '');
  }

  onCaptchaExpired(): void {
    this.registerForm.controls.captchaToken.setValue('');
  }

  // FIX 5: se simplifica. El match de passwords ya lo valida el grupo.
  isStep1Valid(): boolean {
    const { name, surname, email, password, confirmPassword } =
      this.registerForm.controls;

    return (
      name.valid &&
      surname.valid &&
      email.valid &&
      password.valid &&
      confirmPassword.valid
    );
  }

  goToStep2(): void {
    // FIX 2: set en vez de asignacion directa.
    this.currentStep.set(2);
  }

  backToStep1(): void {
    this.errorMessage.set(null);
    this.currentStep.set(1);
  }

  isAdult(date: Date): boolean {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return age >= 18;
  }

  // FIX 4: canSubmit usa phoneNumber.valid en vez de phoneValid.
  canSubmit(): boolean {
    return (
      this.registerForm.controls.termsAccepted.value === true &&
      this.registerForm.controls.birthDate.valid &&
      this.registerForm.controls.phoneNumber.valid &&
      this.registerForm.controls.captchaToken.valid
    );
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const value = this.registerForm.getRawValue();

    // FIX 5: ya no hace falta chequear password !== confirmPassword.
    // El validador de grupo se encargo.

    if (!value.birthDate) return;

    if (!this.isAdult(value.birthDate)) {
      this.errorMessage.set('Debes ser mayor de 18 anos para registrarte');
      return;
    }

    const request = {
      name: value.name!,
      surname: value.surname!,
      email: value.email!,
      phoneNumber: value.phoneNumber!,
      password: value.password!,
      confirmPassword: value.confirmPassword!,
      birthDate: value.birthDate.toISOString().split('T')[0],
      captchaToken: value.captchaToken!,
    };

    this.authService
      .register(request)
      // FIX 3: evita actualizar estado si el componente se destruye antes.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.errorMessage.set(
            error.error?.message ?? 'Error al crear la cuenta'
          );
        },
      });
  }
}
