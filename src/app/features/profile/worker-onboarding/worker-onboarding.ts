import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideIconData,
  Wrench,
  Zap,
  Hammer,
  Paintbrush,
  Sprout,
  Sparkles,
  Key,
  Flame,
  Construction,
  MoreHorizontal,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Upload,
  FileText,
} from 'lucide-angular';
import { WorkerService } from '../../../core/services/worker.service';
import { ClientProfileService } from '../../../core/services/client-profile.service';
import { AddressModalService } from '../../../core/services/address-modal.service';
import { CATEGORIES, CategoryOption } from '../../../shared/constants/categories';
import { SavedAddress } from '../../../models/client.model';
import { Category } from '../../../models/enums/category.enum';

// FIX 5: tipo para los items precomputados de categoría.
// Evita recalcular imagen/icono en cada ciclo de detección de cambios.
interface CategoryView {
  value: Category;
  label: string;
  image: string;
  icon: LucideIconData;
}

@Component({
  selector: 'app-worker-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './worker-onboarding.html',
  styleUrl: './worker-onboarding.scss',
  // FIX 6: OnPush. Con signals y Reactive Forms es seguro.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerOnboardingComponent implements OnInit {
  private readonly workerService = inject(WorkerService);
  private readonly clientProfileService = inject(ClientProfileService);
  private readonly addressModalService = inject(AddressModalService);
  private readonly router = inject(Router);

  // FIX 1: DestroyRef para takeUntilDestroyed. Reemplaza el patron manual
  // de guardar Subscription y hacer unsubscribe en ngOnDestroy.
  private readonly destroyRef = inject(DestroyRef);

  // Steps
  readonly currentStep = signal(0);
  readonly totalSteps = 4;

  // FIX 5: mapa de imagenes como propiedad privada, no como metodo publico.
  private readonly categoryImageMap: Record<string, string> = {
    PLOMERIA: 'plomero.png',
    ELECTRICIDAD: 'electricista.png',
    CARPINTERIA: 'herrero.png',
    PINTURA: 'pintor.png',
    CERRAJERIA: 'cerrajero.png',
    HERRERIA: 'herrero.png',
    REPARACION_PC: 'reparador de pc.png',
    AIRE_ACONDICIONADO: 'reparador de aire acondicionado.png',
  };

  // FIX 5 y 7: mapa de iconos tipado con LucideIconData y cubriendo
  // TODAS las categorias (incluye REPARACION_PC y AIRE_ACONDICIONADO,
  // que antes caian al icono por defecto).
  private readonly categoryIconMap: Record<string, LucideIconData> = {
    PLOMERIA: Wrench,
    ELECTRICIDAD: Zap,
    CARPINTERIA: Hammer,
    PINTURA: Paintbrush,
    JARDINERIA: Sprout,
    LIMPIEZA: Sparkles,
    CERRAJERIA: Key,
    GASISTA: Flame,
    CONSTRUCCION: Construction,
    REPARACION_PC: FileText,
    AIRE_ACONDICIONADO: Flame,
    OTRO: MoreHorizontal,
  };

  // FIX 5: categorias precomputadas con imagen e icono.
  // Antes se recalculaba en el template en cada render.
  readonly categories: CategoryView[] = CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
    image: this.resolveCategoryImage(cat.value),
    icon: this.categoryIconMap[cat.value] ?? MoreHorizontal,
  }));

  // Categorias seleccionadas (solo valores)
  readonly selectedCategories = signal<Category[]>([]);

  // Direccion
  readonly addresses = signal<SavedAddress[]>([]);
  readonly selectedAddress = signal<SavedAddress | null>(null);

  // FIX 4: formulario como signals para que sea reactivo con OnPush.
  // Nota: en el HTML se usan con [ngModel] + (ngModelChange), no [(ngModel)].
  readonly description = signal('');
  readonly yearsOfExperience = signal<number | null>(null);
  readonly hasCertificate = signal(false);
  readonly acceptedTerms = signal(false);

  // Subir archivos
  readonly dniFile = signal<File | null>(null);
  readonly dniFileName = signal('');

  // Loading / Submitted / Error
  readonly isLoading = signal(false);
  readonly isSubmitted = signal(false);

  // FIX 3: reemplazo del alert(). El template renderiza este mensaje
  // en un banner. Es testeable, accesible y no bloquea el hilo.
  readonly errorMessage = signal<string | null>(null);

  // Iconos sueltos que usa el template
  readonly CheckIcon = Check;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly UploadIcon = Upload;
  readonly FileTextIcon = FileText;
  readonly CircleCheckBigIcon = CircleCheckBig;

  // FIX 4: validaciones derivadas con computed. Se recalculan solas
  // cuando cambia cualquier signal del que dependen.
  readonly isStepValid = computed(() => {
    const step = this.currentStep();
    if (step === 0) return this.selectedCategories().length > 0;
    if (step === 1) return this.selectedAddress() !== null;
    if (step === 2) return this.description().trim().length >= 10;
    if (step === 3) return this.acceptedTerms() === true;
    return false;
  });

  readonly canSubmit = computed(
    () =>
      this.acceptedTerms() &&
      this.selectedCategories().length > 0 &&
      this.selectedAddress() !== null &&
      this.description().trim().length >= 10
  );

  ngOnInit(): void {
    this.loadAddresses();
  }

  // FIX 2: takeUntilDestroyed evita actualizar estado en componente destruido.
  loadAddresses(): void {
    this.clientProfileService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.addresses.set(profile.savedAddresses || []);
          if (profile.activeAddress) {
            this.selectedAddress.set(profile.activeAddress);
          }
        },
        error: () => this.addresses.set([]),
      });
  }

  // ----- Categorias -----
  toggleCategory(category: Category): void {
    const current = this.selectedCategories();
    if (current.includes(category)) {
      this.selectedCategories.set(current.filter((c) => c !== category));
    } else if (current.length < 2) {
      this.selectedCategories.set([...current, category]);
    }
  }

  isCategorySelected(category: Category): boolean {
    return this.selectedCategories().includes(category);
  }

  // ----- Direccion -----
  selectAddress(address: SavedAddress): void {
    this.selectedAddress.set(address);
  }

  // FIX 1: el bug principal. Antes la suscripcion a addressUpdated
  // quedaba viva si el usuario cerraba el modal sin guardar, y se
  // acumulaba en cada apertura. Ahora usa take(1) + takeUntilDestroyed.
  openAddressModal(): void {
    this.addressModalService.openCreate();

    this.addressModalService.addressUpdated
      .pipe(
        take(1), // se completa al primer emit
        takeUntilDestroyed(this.destroyRef) // o al destruir el componente
      )
      .subscribe(() => this.loadAddresses());
  }

  // ----- Navegacion de pasos -----
  nextStep(): void {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 0 && step < this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  // ----- Subir archivos -----
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.dniFile.set(file);
      this.dniFileName.set(file.name);
    }
  }

  removeFile(): void {
    this.dniFile.set(null);
    this.dniFileName.set('');
  }

  // ----- Enviar -----
  submit(): void {
    if (!this.canSubmit()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const address = this.selectedAddress();
    if (!address) return; // defensa por si acaso

    const payload = {
      address: address.address,
      labelType: address.labelType,
      customLabel: address.customLabel,
      floor: address.floor,
      apartment: address.apartment,
      latitude: address.latitude,
      longitude: address.longitude,
      categories: this.selectedCategories(),
      description: this.description(),
      yearsOfExperience: this.yearsOfExperience() || 0,
      hasCertificate: this.hasCertificate(),
      acceptedTerms: this.acceptedTerms(),
      dniDocumentUrl: this.dniFileName() || null,
    };

    this.workerService
      .createProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.isSubmitted.set(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          console.error('Error al enviar solicitud:', err);
          this.isLoading.set(false);
          // FIX 3: sin alert()
          this.errorMessage.set(
            'Hubo un error al enviar tu solicitud. Intenta de nuevo.'
          );
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  // FIX 5: helper privado para resolver la imagen. Solo se ejecuta
  // una vez al construir el array de categorias.
  private resolveCategoryImage(category: string): string {
    const fileName = this.categoryImageMap[category];
    return fileName
      ? `assets/images/categories/${fileName}`
      : 'assets/images/categories/default.png';
  }
}