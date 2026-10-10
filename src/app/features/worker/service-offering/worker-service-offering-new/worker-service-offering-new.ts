import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { LucideAngularModule, ArrowLeft, ImagePlus, Send, X, Wrench } from 'lucide-angular';

import { WorkerService } from '../../../../core/services/worker.service';
import {
  WorkerProfile,
  WorkerServiceOfferingRequest,
} from '../../../../models/worker.profile.model';

import { Category } from '../../../../models/enums/category.enum';
import { PriceType } from '../../../../models/enums/price-type.enum';

interface ImagePreview {
  file: File;
  url: string;
}

@Component({
  selector: 'app-worker-service-offering-new',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './worker-service-offering-new.html',
  styleUrl: './worker-service-offering-new.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerServiceOfferingNewComponent {
  private readonly workerService = inject(WorkerService);
  private readonly router = inject(Router);

  readonly icons = {
    ArrowLeft,
    ImagePlus,
    Send,
    X,
    Wrench,
  };

  readonly PriceType = PriceType;

  readonly profile = signal<WorkerProfile | null>(null);

  readonly title = signal('');
  readonly description = signal('');
  readonly category = signal<Category | null>(null);
  readonly priceType = signal<PriceType | null>(null);
  readonly basePrice = signal<number | null>(null);

  readonly images = signal<ImagePreview[]>([]);

  readonly loading = signal(true);
  readonly publishing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly categories = computed<Category[]>(() => this.profile()?.categories ?? []);

  readonly canPublish = computed(() => {
    return (
      this.title().trim().length > 0 &&
      this.description().trim().length > 0 &&
      this.category() !== null &&
      this.priceType() !== null &&
      !this.publishing()
    );
  });

  readonly titleLength = computed(() => this.title().length);
  readonly descriptionLength = computed(() => this.description().length);

  constructor() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.workerService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);

        if (profile.categories.length === 1) {
          this.category.set(profile.categories[0]);
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar tu perfil profesional. Intentá nuevamente.');
        this.loading.set(false);
      },
    });
  }

  updateTitle(value: string): void {
    this.title.set(value);
  }

  updateDescription(value: string): void {
    this.description.set(value);
  }

  updateCategory(value: string): void {
    this.category.set(value as Category);
  }

  updatePriceType(value: string): void {
    this.priceType.set(value as PriceType);
  }

  updateBasePrice(value: string): void {
    if (!value) {
      this.basePrice.set(null);
      return;
    }

    const parsed = Number(value);
    this.basePrice.set(Number.isFinite(parsed) ? parsed : null);
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const selectedFiles = Array.from(input.files);
    const currentImages = this.images();

    const availableSlots = 5 - currentImages.length;

    if (availableSlots <= 0) {
      input.value = '';
      return;
    }

    const filesToAdd = selectedFiles
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, availableSlots);

    const previews = filesToAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    this.images.update((images) => [...images, ...previews]);

    input.value = '';
  }

  removeImage(index: number): void {
    const currentImages = this.images();
    const image = currentImages[index];

    if (image) {
      URL.revokeObjectURL(image.url);
    }

    this.images.set(currentImages.filter((_, i) => i !== index));
  }

  publish(): void {
    if (!this.canPublish()) {
      this.errorMessage.set('Completá los campos obligatorios antes de publicar.');
      return;
    }

    const selectedCategory = this.category();
    const selectedPriceType = this.priceType();

    if (!selectedCategory || !selectedPriceType) {
      return;
    }

    this.publishing.set(true);
    this.errorMessage.set(null);

    const files = this.images().map((image) => image.file);

    const createOffering = (imageUrls: string[]): void => {
      const request: WorkerServiceOfferingRequest = {
        title: this.title().trim(),
        description: this.description().trim(),
        category: selectedCategory,
        basePrice: this.basePrice(),
        priceType: selectedPriceType,
        imageUrls,
      };

      this.workerService.createServiceOffering(request).subscribe({
        next: () => {
          this.router.navigate(['/dashboard/worker']);
        },
        error: (error) => {
          this.publishing.set(false);

          this.errorMessage.set(
            error?.error?.message ?? 'No pudimos publicar tu servicio. Intentá nuevamente.',
          );
        },
      });
    };

    if (files.length === 0) {
      createOffering([]);
      return;
    }

    this.workerService.uploadImages(files).subscribe({
      next: (imageUrls) => {
        createOffering(imageUrls);
      },
      error: (error) => {
        this.publishing.set(false);

        this.errorMessage.set(
          error?.error?.message ?? 'No pudimos subir las imágenes. Intentá nuevamente.',
        );
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/worker']);
  }

  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  getPriceTypeLabel(priceType: PriceType): string {
    const labels: Record<PriceType, string> = {
      [PriceType.FIXED]: 'Precio fijo',
      [PriceType.NEGOTIABLE]: 'Precio a convenir',
      [PriceType.HOURLY]: 'Por hora',
    };

    return labels[priceType];
  }
}
