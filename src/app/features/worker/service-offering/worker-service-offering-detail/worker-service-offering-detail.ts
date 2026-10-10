import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthModalService } from '../../../../core/services/auth.modal.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  LucideAngularModule,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Star,
  UserRound,
  MessageCircle,
  MapPin,
  Wrench,
  Heart,
} from 'lucide-angular';

import { WorkerService } from '../../../../core/services/worker.service';
import { WorkerServiceOffering } from '../../../../models/worker.profile.model';
import { PriceType } from '../../../../models/enums/price-type.enum';
import { Category } from '../../../../models/enums/category.enum';
import { FavoriteService } from '../../../../core/services/favorite.service';
import { ConversationService } from '../../../../core/services/conversation.service';
import { ReviewService } from '../../../../core/services/review.service';
import { ReviewResponse } from '../../../../models/review.model';

@Component({
  selector: 'app-worker-service-offering-detail',
  standalone: true,
  imports: [LucideAngularModule, DecimalPipe, DatePipe],
  templateUrl: './worker-service-offering-detail.html',
  styleUrl: './worker-service-offering-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerServiceOfferingDetailComponent {
  private readonly workerService = inject(WorkerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly favoriteService = inject(FavoriteService);
  private readonly conversationService = inject(ConversationService);
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  readonly contacting = signal(false);
  readonly contactError = signal<string | null>(null);
  readonly isOwnOffering = computed(
    () =>
      !!this.auth.currentUser() && this.offering()?.workerUserId === this.auth.currentUser()?.id,
  );

  readonly icons = {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    BadgeCheck,
    Star,
    UserRound,
    MessageCircle,
    MapPin,
    Wrench,
    Heart,
  };

  createServiceRequest() {
    const offering = this.offering();
    if (offering)
      this.router.navigate(['/requests/new'], {
        queryParams: { title: offering.title, category: offering.category },
      });
  }
  readonly PriceType = PriceType;

  readonly offering = signal<WorkerServiceOffering | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedImageIndex = signal(0);

  // =========================================================
  // REVIEWS
  // =========================================================

  readonly reviews = signal<ReviewResponse[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal(false);

  readonly reviewCount = computed(() => this.reviews().length);

  readonly hasReviews = computed(() => this.reviews().length > 0);

  // =========================================================
  // GALLERY
  // =========================================================

  readonly selectedImage = computed(() => {
    const images = this.offering()?.imageUrls ?? [];
    const index = this.selectedImageIndex();

    return images[index] ?? null;
  });

  readonly hasImages = computed(() => {
    return (this.offering()?.imageUrls?.length ?? 0) > 0;
  });

  readonly imageCount = computed(() => {
    return this.offering()?.imageUrls?.length ?? 0;
  });

  // =========================================================
  // PRICE
  // =========================================================

  readonly formattedPrice = computed(() => {
    const offering = this.offering();

    if (!offering) {
      return '';
    }

    const hasPrice = offering.basePrice != null && offering.basePrice > 0;

    // Sin precio: mostramos el genérico según el tipo
    if (!hasPrice) {
      return offering.priceType === PriceType.NEGOTIABLE ? 'A convenir' : 'Precio a consultar';
    }

    const price = new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 0,
    }).format(offering.basePrice!);

    // NEGOTIABLE con precio: "Desde $X"
    if (offering.priceType === PriceType.NEGOTIABLE) {
      return `Desde $${price}`;
    }

    // HOURLY: "$X / hora"
    if (offering.priceType === PriceType.HOURLY) {
      return `$${price} / hora`;
    }

    // FIXED (o cualquier otro): "$X"
    return `$${price}`;
  });

  readonly categoryLabel = computed(() => {
    const category = this.offering()?.category;

    if (!category) {
      return '';
    }

    return this.getCategoryLabel(category);
  });

  constructor() {
    this.loadOffering();
  }

  // =========================================================
  // LOAD OFFERING
  // =========================================================

  private loadOffering(): void {
    const offeringId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(offeringId) || offeringId <= 0) {
      this.errorMessage.set('El servicio solicitado no es válido.');
      this.loading.set(false);
      return;
    }

    this.workerService
      .getServiceOfferingById(offeringId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (offering) => {
          this.offering.set(offering);
          this.selectedImageIndex.set(0);
          this.loading.set(false);

          this.loadReviews(offering.workerId);
        },
        error: () => {
          this.errorMessage.set(
            'No pudimos cargar este servicio. Es posible que ya no esté disponible.',
          );
          this.loading.set(false);
        },
      });
  }

  // =========================================================
  // REVIEWS
  // =========================================================

  private loadReviews(workerProfileId: number): void {
    this.reviewsLoading.set(true);
    this.reviewsError.set(false);

    this.reviewService
      .getWorkerReviews(workerProfileId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews);
          this.reviewsLoading.set(false);
        },
        error: () => {
          this.reviewsError.set(true);
          this.reviewsLoading.set(false);
        },
      });
  }

  // =========================================================
  // GALLERY
  // =========================================================

  selectImage(index: number): void {
    const total = this.imageCount();

    if (index < 0 || index >= total) {
      return;
    }

    this.selectedImageIndex.set(index);
  }

  previousImage(): void {
    const total = this.imageCount();

    if (total <= 1) {
      return;
    }

    this.selectedImageIndex.update((index) => (index === 0 ? total - 1 : index - 1));
  }

  nextImage(): void {
    const total = this.imageCount();

    if (total <= 1) {
      return;
    }

    this.selectedImageIndex.update((index) => (index === total - 1 ? 0 : index + 1));
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  goBack(): void {
    this.router.navigate(['/']);
  }

  openWorkerProfile(): void {
    const workerId = this.offering()?.workerId;

    if (!workerId) {
      return;
    }

    this.router.navigate(['/workers', workerId]);
  }

  // =========================================================
  // CONVERSATION
  // =========================================================

  contactWorkerByMessaging(): void {
    const offeringId = this.offering()?.id;

    if (!offeringId || this.contacting()) {
      return;
    }

    this.contactError.set(null);
    if (this.isOwnOffering()) {
      this.contactError.set(
        'Esta es tu publicación. No necesitás abrir una conversación con vos mismo.',
      );
      return;
    }
    if (!this.auth.currentUser()) {
      this.authModal.show();
      return;
    }
    this.contacting.set(true);
    this.conversationService
      .createFromOffering(offeringId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.contacting.set(false)),
      )
      .subscribe({
        next: (conversation) => {
          this.router.navigate(['/conversations', conversation.id]);
        },
        error: (error) => {
          const reason =
            error instanceof HttpErrorResponse ? String(error.error?.message ?? '') : '';
          this.contactError.set(
            reason.includes('contact yourself')
              ? 'Esta es tu publicación. No podés consultarte a vos mismo.'
              : reason || 'No pudimos abrir la conversación. Intentá nuevamente.',
          );
        },
      });
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  isFavorite(offeringId: number): boolean {
    return this.favoriteService.isFavorite(offeringId);
  }

  toggleFavorite(offeringId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteService.toggle(offeringId);
  }
}
