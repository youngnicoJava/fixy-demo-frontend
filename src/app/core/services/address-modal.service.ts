import { Injectable, signal } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { SavedAddress } from '../../models/client.model';
import { AddressData, AddressOwner } from '../../models/address.model';

@Injectable({
  providedIn: 'root',
})
export class AddressModalService {
  readonly open = signal(false);
  readonly mode = signal<'create' | 'edit'>('create');
  readonly owner = signal<AddressOwner>('client');

  readonly selectedAddress = signal<SavedAddress | null>(null);
  readonly selectedAddressData = signal<AddressData | null>(null);

  addressUpdated = new EventEmitter<void>();

  openCreate(owner: AddressOwner = 'client'): void {
    this.owner.set(owner);
    this.mode.set('create');

    this.selectedAddress.set(null);
    this.selectedAddressData.set(null);

    this.open.set(true);
  }

  openEdit(address: SavedAddress): void {
    this.owner.set('client');
    this.mode.set('edit');

    this.selectedAddress.set(address);
    this.selectedAddressData.set({
      address: address.address,
      labelType: address.labelType ?? null,
      customLabel: address.customLabel ?? null,
      floor: address.floor ?? null,
      apartment: address.apartment ?? null,
      latitude: address.latitude,
      longitude: address.longitude,
    });

    this.open.set(true);
  }

  openWorkerEdit(address: AddressData): void {
    this.owner.set('worker');
    this.mode.set('edit');

    this.selectedAddress.set(null);
    this.selectedAddressData.set(address);

    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  emitAddressUpdated(): void {
    this.addressUpdated.emit();
  }
}
