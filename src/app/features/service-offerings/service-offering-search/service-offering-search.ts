import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule,
  BadgeCheck,
  Star,
  UserRound,
  Wrench,
  Heart,
} from 'lucide-angular';
import { catchError, of, switchMap } from 'rxjs';

import { WorkerService } from '../../../core/services/worker.service';
import { WorkerServiceOffering } from '../../../models/worker.profile.model';
import { Category } from '../../../models/enums/category.enum';
import { CATEGORIES } from '../../../shared/constants/categories';
import { FavoriteService } from '../../../core/services/favorite.service';

@Component({
  selector: 'app-service-offering-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './service-offering-search.html',
  styleUrl: './service-offering-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceOfferingSearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workerService = inject(WorkerService);
  private readonly destroyRef = inject(DestroyRef);

  // FIX: favoriteService publico pero con metodos envueltos abajo.
  // No lo expongas entero al template.
  private readonly favoriteService = inject(FavoriteService);

  // FIX: exponemos el signal de favoritos al template.
  readonly favoriteIds = this.favoriteService.favoriteIds;

  readonly icons = {
    BadgeCheck,
    Star,
    UserRound,
    Wrench,
    Heart,
  };

  readonly serviceOfferings = signal<WorkerServiceOffering[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly category = signal<Category | null>(null);
  readonly searchTerm = signal('');

  readonly categoryLabel = computed(() => {
    const value = this.category();
    if (!value) return null;
    return CATEGORIES.find((c) => c.value === value)?.label ?? value;
  });

  // FIX: precomputamos el label de cada servicio para no llamar
  // a un metodo por item en el template.
  readonly serviceOfferingsWithLabels = computed(() => {
    return this.serviceOfferings().map((service) => ({
      ...service,
      categoryLabel:
        CATEGORIES.find((c) => c.value === service.category)?.label ??
        service.category,
    }));
  });

  readonly matchingServiceOfferings = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const services = this.serviceOfferingsWithLabels();

    if (!query) return services;

    const terms = query.split(/\s+/).filter((term) => term.length >= 2);

    return services
      .map((service) => {
        const searchableText = [
          service.title,
          service.description,
          service.workerFullName,
        ]
          .join(' ')
          .toLowerCase();

        const matchedTerms = terms.filter((term) =>
          searchableText.includes(term)
        ).length;

        return { service, score: matchedTerms };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.service);
  });

  readonly displayedServiceOfferings = computed(() => {
    const matches = this.matchingServiceOfferings();
    if (matches.length > 0) return matches;
    return this.serviceOfferingsWithLabels();
  });

  readonly hasSearchFallback = computed(() => {
    return (
      this.searchTerm().trim().length > 0 &&
      this.matchingServiceOfferings().length === 0 &&
      this.serviceOfferings().length > 0
    );
  });

  readonly resultsTitle = computed(() => {
    const query = this.searchTerm().trim();
    if (query) return `Resultados para "${query}"`;
    if (this.categoryLabel()) return `Servicios de ${this.categoryLabel()}`;
    return 'Todos los servicios';
  });

  ngOnInit(): void {
    // FIX: switchMap cancela el request anterior al cambiar de categoria.
    // takeUntilDestroyed cierra la suscripcion al destruir el componente.
    this.route.queryParamMap
      .pipe(
        switchMap((params) => {
          const category = params.get('category') as Category | null;
          const query = params.get('q') ?? '';

          this.category.set(category);
          this.searchTerm.set(query);

          if (!category) {
            this.loading.set(false);
            this.error.set(false);
            return of([]);
          }

          this.loading.set(true);
          this.error.set(false);

          return this.workerService.getServiceOfferingsByCategory(category).pipe(
            catchError(() => {
              this.error.set(true);
              return of([]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((services) => {
        this.serviceOfferings.set(services);
        this.loading.set(false);
      });
  }

  goToServiceOffering(serviceOfferingId: number): void {
    this.router.navigate(['/services', serviceOfferingId]);
  }

  goToWorker(workerId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/workers', workerId]);
  }

  // FIX: eliminado getCategoryLabel (ahora es parte del computed).

  // FIX: isFavorite y toggleFavorite se pueden reemplazar en el template
  // usando favoriteIds().has(id) y favoriteService.toggle(id).
  // Los dejo aca por si preferis mantener el template simple.
  isFavorite(offeringId: number): boolean {
    return this.favoriteService.isFavorite(offeringId);
  }

  toggleFavorite(offeringId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteService.toggle(offeringId);
  }
}