import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Home,
  Briefcase,
  Pencil,
  X,
} from 'lucide-angular';

import { AddressModalService } from '../../core/services/address-modal.service';
import { LocationResult } from '../../models/location.model';
import { AddressAutocomplete } from '../address-autocomplete/address-autocomplete';
import { MapComponent } from '../map/map';
import { LocationService } from '../../core/services/location.service';
import { ClientProfileService } from '../../core/services/client-profile.service';
import { WorkerService } from '../../core/services/worker.service';

import { SavedAddressRequest } from '../../models/client.model';
import { AddressData } from '../../models/address.model';
import { WorkerAddressRequest } from '../../models/worker.address.model';

@Component({
  selector: 'app-address-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AddressAutocomplete,
    MapComponent,
    LucideAngularModule,
  ],
  templateUrl: './address-modal.html',
  styleUrl: './address-modal.scss',
  // FIX 3: OnPush. Los signals y ReactiveForms manejan la deteccion.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressModal {
  // =========================================================
  // ICONS
  // =========================================================

  readonly HomeIcon = Home;
  readonly BriefcaseIcon = Briefcase;
  readonly PencilIcon = Pencil;
  readonly XIcon = X;

  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly addressModalService = inject(AddressModalService);
  private readonly fb = inject(FormBuilder);
  private readonly locationService = inject(LocationService);
  private readonly clientProfileService = inject(ClientProfileService);
  private readonly workerService = inject(WorkerService);

  // FIX 6: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  // =========================================================
  // SERVICE STATE
  // =========================================================

  readonly open = this.addressModalService.open;
  readonly mode = this.addressModalService.mode;
  readonly owner = this.addressModalService.owner;
  readonly selectedAddress = this.addressModalService.selectedAddress;
  readonly selectedAddressData = this.addressModalService.selectedAddressData;

  // =========================================================
  // LOCAL STATE
  // =========================================================

  readonly selectedLocation = signal<LocationResult | null>(null);

  readonly labelOptions = [
    { value: 'home' as const, label: 'Casa', icon: Home },
    { value: 'work' as const, label: 'Trabajo', icon: Briefcase },
    { value: 'other' as const, label: 'Otro', icon: Pencil },
  ];

  // =========================================================
  // FORM
  // =========================================================

  readonly addressForm = this.fb.nonNullable.group({
    labelType: ['home' as 'home' | 'work' | 'other', Validators.required],
    customLabel: [''],
    address: ['', Validators.required],
    floor: [''],
    apartment: [''],
  });

  // FIX 9: derivamos del form en vez de mantener dos fuentes de verdad.
  readonly selectedLabelType = toSignal(
    this.addressForm.controls.labelType.valueChanges,
    { initialValue: this.addressForm.controls.labelType.value }
  );

  // FIX 7: formValue como signal para que isFormValid reaccione.
  readonly formValue = toSignal(this.addressForm.valueChanges, {
    initialValue: this.addressForm.getRawValue(),
  });

  // FIX 7: isFormValid como computed en vez de getter.
  readonly isFormValid = computed(() => {
    const form = this.formValue();
    const labelType = this.selectedLabelType();
    const location = this.selectedLocation();

    const hasValidLabel =
      labelType !== 'other' ||
      (labelType === 'other' && (form.customLabel?.trim()?.length ?? 0) > 0);

    return !!form.address?.trim() && location !== null && hasValidLabel;
  });

  // FIX 8: displayLabel como computed en vez de metodo.
  readonly displayLabel = computed(() => {
    const type = this.selectedLabelType();

    if (type === 'home') return 'Casa';
    if (type === 'work') return 'Trabajo';

    const custom = this.formValue().customLabel;
    return custom?.trim() || 'Otro';
  });

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor() {
    // FIX 5: effect con adapter unificado para populateForm.
    effect(() => {
      const owner = this.owner();
      const mode = this.mode();
      const address = this.selectedAddress();
      const addressData = this.selectedAddressData();

      if (mode === 'edit' && owner === 'client' && address) {
        this.populateForm(this.toAddressData(address));
        return;
      }

      if (mode === 'edit' && owner === 'worker' && addressData) {
        this.populateForm(this.toAddressData(addressData));
        return;
      }

      this.resetForm();
    });
  }

  // =========================================================
  // FORM / LOCATION
  // =========================================================

  // FIX 5: adapter unificado que convierte cualquier fuente a AddressData.
 private toAddressData(source: {
  address: string;
  labelType?: 'home' | 'work' | 'other' | null;
  customLabel?: string | null;
  floor?: string | null;
  apartment?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): AddressData {
  return {
    address: source.address,
    labelType: source.labelType ?? 'home',
    customLabel: source.customLabel ?? '',
    floor: source.floor ?? '',
    apartment: source.apartment ?? '',
    latitude: source.latitude ?? null,
    longitude: source.longitude ?? null,
  };
}

  private populateForm(data: AddressData): void {
  this.selectedLocation.set({
    label: this.getLocationLabel(data),
    address: data.address,
    latitude: data.latitude ?? 0,
    longitude: data.longitude ?? 0,
  });

  this.addressForm.patchValue({
    labelType: data.labelType ?? 'home',
    customLabel: data.customLabel ?? '',
    address: data.address,
    floor: data.floor ?? '',
    apartment: data.apartment ?? '',
  });
}

  private resetForm(): void {
    this.selectedLocation.set(null);

    this.addressForm.reset({
      labelType: 'home',
      customLabel: '',
      address: '',
      floor: '',
      apartment: '',
    });

    // FIX 1: eliminado this.autocomplete.updateQuery('').
  }

  private getLocationLabel(data: AddressData): string {
    if (data.labelType === 'home') return 'Casa';
    if (data.labelType === 'work') return 'Trabajo';

    return data.customLabel?.trim() || 'Otro';
  }

  // =========================================================
  // LOCATION
  // =========================================================

  onLocationSelected(location: LocationResult): void {
    this.selectedLocation.set(location);

    this.addressForm.patchValue({
      address: location.address,
    });

    // FIX 1: eliminado this.autocomplete.updateQuery(...).
    // FIX 3: eliminado cdr.detectChanges().
  }

  onMapClick(event: {
    latitude: number;
    longitude: number;
    fromMap?: boolean;
  }): void {
    if (event.fromMap) {
      this.locationService
        .reverseGeocode(event.latitude, event.longitude)
        // FIX 6: takeUntilDestroyed evita actualizar estado si el modal se cierra.
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (location) => {
            this.selectedLocation.set(location);

            this.addressForm.patchValue({
              address: location.address,
            });

            // FIX 2: eliminado el hack de document.querySelector.
            // El [query] del template se encarga.
          },
          error: () => {
            const fallbackAddress = `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`;

            this.selectedLocation.set({
              label: 'Ubicacion seleccionada en el mapa',
              address: fallbackAddress,
              latitude: event.latitude,
              longitude: event.longitude,
            });

            this.addressForm.patchValue({
              address: fallbackAddress,
            });

            // FIX 1: eliminado this.autocomplete.updateQuery(...).
          },
        });

      return;
    }

    const current = this.selectedLocation();

    if (current) {
      this.selectedLocation.set({
        ...current,
        latitude: event.latitude,
        longitude: event.longitude,
      });

      // FIX 3: eliminado cdr.detectChanges().
    }
  }

  // =========================================================
  // LABEL
  // =========================================================

  selectLabelType(type: 'home' | 'work' | 'other'): void {
    // FIX 9: solo actualizamos el form. El signal se deriva solo.
    this.addressForm.patchValue({ labelType: type });
  }

  // FIX 8: getDisplayLabel eliminado. Ahora es displayLabel computed.

  // =========================================================
  // SAVE
  // =========================================================

  save(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const location = this.selectedLocation();

    if (!location) {
      // FIX 4: reemplazar alert por toast cuando este disponible.
      // this.toastService.show('Selecciona una direccion');
      return;
    }

    const formValue = this.addressForm.getRawValue();

    if (this.owner() === 'worker') {
      this.saveWorkerAddress(location, formValue);
      return;
    }

    this.saveClientAddress(location, formValue);
  }

  // =========================================================
  // CLIENT ADDRESS
  // =========================================================

  private saveClientAddress(
    location: LocationResult,
    formValue: {
      labelType: 'home' | 'work' | 'other';
      customLabel: string;
      address: string;
      floor: string;
      apartment: string;
    }
  ): void {
    const payload: SavedAddressRequest = {
      // FIX 8: usamos el computed displayLabel.
      label: this.displayLabel(),
      labelType: formValue.labelType,
      customLabel:
        formValue.labelType === 'other' ? formValue.customLabel : undefined,
      address: location.address,
      floor: formValue.floor || undefined,
      apartment: formValue.apartment || undefined,
    };

    // =======================================================
    // EDITAR CLIENTE
    // =======================================================

    if (this.mode() === 'edit') {
      const addressId = this.selectedAddress()?.id;

      if (!addressId) {
        return;
      }

      this.clientProfileService
        .updateAddress(addressId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.close();
            this.addressModalService.emitAddressUpdated();
          },
          error: () => {
            // FIX 4: reemplazar alert por toast.
          },
        });

      return;
    }

    // =======================================================
    // CREAR CLIENTE
    // =======================================================

    this.clientProfileService
      .addAddress(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.close();
          this.addressModalService.emitAddressUpdated();
        },
        error: () => {
          // FIX 4: reemplazar alert por toast.
        },
      });
  }

  // =========================================================
  // WORKER ADDRESS
  // =========================================================

  private saveWorkerAddress(
    location: LocationResult,
    formValue: {
      labelType: 'home' | 'work' | 'other';
      customLabel: string;
      address: string;
      floor: string;
      apartment: string;
    }
  ): void {
    const payload: WorkerAddressRequest = {
      // FIX 8: usamos el computed displayLabel.
      label: this.displayLabel(),
      labelType: formValue.labelType,
      customLabel:
        formValue.labelType === 'other' ? formValue.customLabel : undefined,
      floor: formValue.floor || undefined,
      apartment: formValue.apartment || undefined,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    // =======================================================
    // CREAR WORKER ADDRESS
    // =======================================================

    if (this.mode() === 'create') {
      this.workerService
        .addAddress(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.close();
            this.addressModalService.emitAddressUpdated();
          },
          error: () => {
            // FIX 4: reemplazar alert por toast.
          },
        });

      return;
    }

    // =======================================================
    // EDITAR WORKER ADDRESS
    // =======================================================

    const currentAddress = this.selectedAddressData();

    if (!currentAddress?.id) {
      // FIX 4: reemplazar alert por toast.
      return;
    }

    this.workerService
      .updateAddress(currentAddress.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.close();
          this.addressModalService.emitAddressUpdated();
        },
        error: () => {
          // FIX 4: reemplazar alert por toast.
        },
      });
  }

  // =========================================================
  // MODAL
  // =========================================================

  close(): void {
    this.addressModalService.close();
  }

  // =========================================================
  // MAP
  // =========================================================

  openMapPicker(): void {
    const container = document.querySelector('.map-container');

    if (container) {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  // =========================================================
  // EVENTS
  // =========================================================

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}