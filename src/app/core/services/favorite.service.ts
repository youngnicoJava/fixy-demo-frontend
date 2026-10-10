import {AuthService} from './auth.service';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastService = inject(ToastService);

  private readonly STORAGE_KEY = 'fixy-demo.favorites.' + (inject(AuthService).currentUser()?.id ?? 'anonymous');

  // Signal privado con Set<number>. Solo el service puede mutarlo.
  private readonly _favoriteIds = signal<Set<number>>(this.loadFavorites());

  // Signal publico de solo lectura.
  readonly favorites = this._favoriteIds.asReadonly();

  // Alias para componentes que ya usaban 'favoriteIds'.
  readonly favoriteIds = this.favorites;

  // FIX: computed con la cantidad de favoritos.
  // El navbar lo usa para mostrar el badge del corazon.
  // Reemplaza el uso de '.length' que rompia con Set.
  readonly favoritesCount = computed(() => this._favoriteIds().size);

  isFavorite(offeringId: number): boolean {
    return this._favoriteIds().has(offeringId);
  }

  toggle(offeringId: number): void {
    if (this.isFavorite(offeringId)) {
      this.remove(offeringId);
      this.toastService.show('Eliminado de favoritos');
      return;
    }

    this.add(offeringId);
    this.toastService.show('Anadido a favoritos');
  }

  add(offeringId: number): void {
    if (this.isFavorite(offeringId)) {
      return;
    }

    // Creamos un nuevo Set para que el signal detecte el cambio.
    // Mutar el Set existente no dispararia el cambio (misma referencia).
    this._favoriteIds.update((ids) => {
      const next = new Set(ids);
      next.add(offeringId);
      return next;
    });

    this.persist();
  }

  remove(offeringId: number): void {
    this._favoriteIds.update((ids) => {
      const next = new Set(ids);
      next.delete(offeringId);
      return next;
    });

    this.persist();
  }

  clear(): void {
    this._favoriteIds.set(new Set());
    this.persist();
  }

  private loadFavorites(): Set<number> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Set();
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (!stored) {
        return new Set();
      }

      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return new Set();
      }

      const validIds = parsed.filter(
        (id): id is number =>
          typeof id === 'number' && Number.isInteger(id) && id > 0
      );

      return new Set(validIds);
    } catch {
      return new Set();
    }
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Set no es serializable a JSON directamente.
    // Lo convertimos a array antes de guardar.
    const ids = Array.from(this._favoriteIds());

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
  }
}
