import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Heart,
  HeartOff,
  ArrowLeft,
  BadgeCheck,
  Star,
} from 'lucide-angular';
import { DecimalPipe } from '@angular/common';

import { FavoriteService } from '../../core/services/favorite.service';
import { WorkerService } from '../../core/services/worker.service';
import { WorkerServiceOffering } from '../../models/worker.profile.model';
import { PriceType } from '../../models/enums/price-type.enum';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [LucideAngularModule, DecimalPipe],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private readonly favoriteService = inject(FavoriteService);
  private readonly workerService = inject(WorkerService);
  private readonly router = inject(Router);

  readonly icons = {
    Heart,
    HeartOff,
    ArrowLeft,
    BadgeCheck,
    Star,
  };

  readonly offerings = signal<WorkerServiceOffering[]>([]);
  readonly loading = signal(true);

  readonly favoriteIds = this.favoriteService.favorites;

  // FIX 1: .size en vez de .length.
  readonly hasFavorites = computed(() => this.favoriteIds().size > 0);

  constructor() {
    // FIX 3: effect reacciona a los cambios en favoriteIds.
    // Se ejecuta al crear y cada vez que favoriteIds cambia.
    // Elimina la necesidad de llamar loadFavorites en el constructor
    // y de filtrar manualmente en toggleFavorite.
    effect(() => {
      const ids = Array.from(this.favoriteIds()); // FIX 2: Set → Array
      this.loadOfferings(ids);
    });
  }

  private loadOfferings(ids: number[]): void {
    if (ids.length === 0) {
      this.offerings.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    Promise.all(
      ids.map(
        (id) =>
          new Promise<WorkerServiceOffering | null>((resolve) => {
            this.workerService.getServiceOfferingById(id).subscribe({
              next: (offering) => resolve(offering),
              error: () => resolve(null),
            });
          })
      )
    ).then((results) => {
      const validOfferings = results.filter(
        (offering): offering is WorkerServiceOffering => offering !== null
      );

      this.offerings.set(validOfferings);
      this.loading.set(false);
    });
  }

  isFavorite(offeringId: number): boolean {
    return this.favoriteService.isFavorite(offeringId);
  }

  toggleFavorite(offeringId: number, event: MouseEvent): void {
    event.stopPropagation();
    // FIX 4: solo toggleamos. El effect recarga los offerings.
    this.favoriteService.toggle(offeringId);
  }

  openOffering(offeringId: number): void {
    this.router.navigate(['/services', offeringId]);
  }

  openWorker(workerId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/workers', workerId]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getPrice(offering: WorkerServiceOffering): string {
    if (
      offering.priceType === PriceType.NEGOTIABLE ||
      offering.basePrice === null
    ) {
      return 'Precio a convenir';
    }

    const price = new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 0,
    }).format(offering.basePrice);

    if (offering.priceType === PriceType.HOURLY) {
      return `$${price} / hora`;
    }

    return `$${price}`;
  }

  getCategoryLabel(category: string): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}