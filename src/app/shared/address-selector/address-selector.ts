import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { LucideAngularModule, MapPin, Pencil, Trash2, ChevronDown } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth.modal.service';
import { ClientProfileService } from '../../core/services/client-profile.service';
import { WorkerService } from '../../core/services/worker.service';
import { AddressModalService } from '../../core/services/address-modal.service';

import { ClientProfile, SavedAddress } from '../../models/client.model';
import {
  WorkerSavedAddress,
  WorkerAddressProfileResponse,
} from '../../models/worker.address.model';
import { Role } from '../../models/enums/Role.enum';

type Address = SavedAddress | WorkerSavedAddress;

@Component({
  selector: 'app-address-selector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './address-selector.html',
  styleUrl: './address-selector.scss',
  // FIX: OnPush. Los signals ya manejaban el estado, solo faltaba esto.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressSelectorComponent implements OnInit {
  // =========================================================
  // ICONS
  // =========================================================

  readonly MapPinIcon = MapPin;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly ChevronDown = ChevronDown;

  // =========================================================
  // SIGNALS
  // =========================================================

  readonly addresses = signal<Address[]>([]);
  readonly activeAddress = signal<Address | null>(null);
  readonly open = signal(false);

  readonly opened = output<void>();

  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly elementRef = inject(ElementRef);
  private readonly authService = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly clientProfileService = inject(ClientProfileService);
  private readonly workerService = inject(WorkerService);
  private readonly addressModalService = inject(AddressModalService);

  // FIX 1: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    // FIX 1: takeUntilDestroyed evita fugas al destruir el componente.
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!user) {
          this.clearAddresses();
          return;
        }

        // FIX 4: usamos el enum Role en vez de strings.
        if (user.role === Role.CLIENT) {
          this.loadClientAddresses();
          return;
        }

        if (user.role === Role.WORKER) {
          this.loadWorkerAddresses();
          return;
        }

        this.clearAddresses();
      });

    // FIX 2: debounceTime evita multiples requests si llegan varias
    // actualizaciones seguidas. FIX 1: takeUntilDestroyed.
    this.addressModalService.addressUpdated
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadAddresses();
      });
  }

  // =========================================================
  // LOAD ADDRESSES
  // =========================================================

  private loadAddresses(): void {
    const user = this.authService.currentUser();

    if (!user) {
      this.clearAddresses();
      return;
    }

    if (user.role === Role.CLIENT) {
      this.loadClientAddresses();
      return;
    }

    if (user.role === Role.WORKER) {
      this.loadWorkerAddresses();
    }
  }

  private loadClientAddresses(): void {
    this.clientProfileService
      .getProfile()
      // FIX 1: cleanup de la suscripcion.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.updateClientProfileData(profile);
        },
      });
  }

  private loadWorkerAddresses(): void {
    this.workerService
      .getMyAddresses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile: WorkerAddressProfileResponse) => {
          this.updateWorkerProfileData(profile);
        },
      });
  }

  private updateClientProfileData(profile: ClientProfile): void {
    this.addresses.set(profile.savedAddresses);
    this.activeAddress.set(profile.activeAddress);
  }

  private updateWorkerProfileData(profile: WorkerAddressProfileResponse): void {
    this.addresses.set(profile.savedAddresses);
    this.activeAddress.set(profile.activeAddress);
  }

  private clearAddresses(): void {
    this.addresses.set([]);
    this.activeAddress.set(null);
  }

  // =========================================================
  // DROPDOWN
  // =========================================================

  toggle(): void {
    if (!this.authService.isAuthenticated()) {
      this.authModal.show();
      return;
    }

    if (!this.open()) {
      this.opened.emit();
    }

    this.open.update((value) => !value);
  }

  closeDropdown(): void {
    this.open.set(false);
  }

  // =========================================================
  // SELECT ADDRESS
  // =========================================================

  selectAddress(address: Address): void {
    const user = this.authService.currentUser();

    if (!user) {
      return;
    }

    if (user.role === Role.CLIENT) {
      this.clientProfileService
        .setActiveAddress(address.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.updateClientProfileData(profile);
            this.open.set(false);
          },
          // FIX 6: manejo de error. Antes fallaba en silencio.
          error: () => {
            // TODO: mostrar toast
          },
        });

      return;
    }

    if (user.role === Role.WORKER) {
      this.workerService
        .setActiveAddress(address.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.updateWorkerProfileData(profile);
            this.open.set(false);
          },
          error: () => {
            // TODO: mostrar toast
          },
        });
    }
  }

  // =========================================================
  // DELETE ADDRESS
  // =========================================================

  deleteAddress(address: Address, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeAddress()?.id === address.id) {
      // FIX 3: reemplazar alert por toast cuando este disponible.
      // Por ahora dejo alert para no romper nada, pero es deuda tecnica.
      alert('No podes eliminar la direccion activa.');
      return;
    }

    // FIX 3: reemplazar confirm por modal propio cuando este disponible.
    const confirmed = confirm(
      `Seguro que queres eliminar "${address.label}" de tus direcciones?`
    );

    if (!confirmed) {
      return;
    }

    const user = this.authService.currentUser();

    if (!user) {
      return;
    }

    if (user.role === Role.CLIENT) {
      this.clientProfileService
        .removeAddress(address.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.updateClientProfileData(profile);
          },
          error: () => {
            // TODO: mostrar toast
          },
        });

      return;
    }

    if (user.role === Role.WORKER) {
      this.workerService
        .removeAddress(address.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.updateWorkerProfileData(profile);
          },
          error: () => {
            // TODO: mostrar toast
          },
        });
    }
  }

  // =========================================================
  // MODAL
  // =========================================================

  addAddress(): void {
    const user = this.authService.currentUser();

    if (!user) {
      return;
    }

    if (user.role === Role.WORKER) {
      this.addressModalService.openCreate('worker');
      return;
    }

    if (user.role === Role.CLIENT) {
      this.addressModalService.openCreate('client');
    }
  }

  editAddress(address: Address, event: MouseEvent): void {
  event.stopPropagation();

  const user = this.authService.currentUser();

  if (!user) {
    return;
  }

  if (user.role === Role.CLIENT) {
    this.addressModalService.openEdit(address as SavedAddress);
    return;
  }

  if (user.role === Role.WORKER) {
    this.addressModalService.openWorkerEdit(address as WorkerSavedAddress);
  }
}
  // =========================================================
  // OUTSIDE CLICK
  // =========================================================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // FIX 7: usamos data-attribute en vez de selectores fragiles.
    // Requiere agregar [attr.data-ignore-outside-click]="true" al mapa
    // o a cualquier elemento que no deba cerrar el dropdown.
    if (target.closest('[data-ignore-outside-click]')) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}