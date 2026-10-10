import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  OnDestroy, DestroyRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { WorkerService } from '../../../core/services/worker.service';
import { WorkerServiceOffering } from '../../../models/worker.profile.model';
import { CATEGORIES, CategoryOption } from '../../../shared/constants/categories';
import { FooterComponent } from '../../../shared/footer/footer';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { FavoriteService } from '../../../core/services/favorite.service';
import {
  ChevronLeft,
  ChevronRight,
  Wrench,
  BadgeCheck,
  UserRound,
  Star,
  BriefcaseBusiness,
  Heart,
} from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, LucideAngularModule, ScrollRevealDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly BriefcaseBusinessIcon = BriefcaseBusiness;
  readonly WrenchIcon = Wrench;
  readonly BadgeCheckIcon = BadgeCheck;
  readonly UserRoundIcon = UserRound;
  readonly StarIcon = Star;
  readonly HeartIcon = Heart;

  private readonly workerService = inject(WorkerService);
  private readonly router = inject(Router);
  private readonly favoriteService = inject(FavoriteService);

  private slideInterval?: number;

  readonly categories = CATEGORIES;

  readonly selectedCategory = signal<CategoryOption>(CATEGORIES[0]);

  readonly serviceOfferings = signal<WorkerServiceOffering[]>([]);
  readonly loading = signal(true);

  readonly heroSlides = [
    {
      title: 'Encontrá el profesional que necesitás',
      subtitle: 'Plomeros, electricistas, pintores y más. Verificados y cerca tuyo.',
      primaryAction: 'Buscar profesionales',
      secondaryAction: 'Quiero trabajar en Fixy',
      image: 'assets/images/hero-2.jpg',
    },
    {
      title: 'Servicios confiables para tu hogar',
      subtitle: 'Contratá con tranquilidad y elegí entre profesionales verificados.',
      primaryAction: 'Ver profesionales',
      secondaryAction: 'Cómo funciona',
      image: 'assets/images/hero-2.jpg',
    },
    {
      title: '¿Qué es Fixy?',
      subtitle: 'Conectamos personas con profesionales de confianza en su zona.',
      primaryAction: 'Conocenos',
      secondaryAction: 'Explorar oficios',
      image: 'assets/images/hero-2.jpg',
    },
  ];

  readonly activeSlide = signal(0);

  readonly steps = [
    {
      number: '01',
      title: 'Buscá el oficio',
      description: 'Seleccioná qué tipo de profesional necesitás.',
    },
    {
      number: '02',
      title: 'Elegí el servicio',
      description: 'Explorá servicios, precios y valoraciones de profesionales.',
    },
    {
      number: '03',
      title: 'Contratá con confianza',
      description: 'Coordiná el trabajo y calificá el servicio.',
    },
  ];

ngOnInit() {
  this.fetchServiceOfferings();

  if (typeof window === 'undefined') return;
  this.slideInterval = window.setInterval(() => {
    this.nextSlide(false); 
  }, 6000);
}

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide(restartTimer = true): void {
  const next = (this.activeSlide() + 1) % this.heroSlides.length;
  this.activeSlide.set(next);

  if (restartTimer) {
    this.restartAutoplay();
  }
}

 prevSlide(): void {
  const prev = this.activeSlide() === 0 ? this.heroSlides.length - 1 : this.activeSlide() - 1;
  this.activeSlide.set(prev);
  this.restartAutoplay(); 
}

 goToSlide(index: number): void {
  this.activeSlide.set(index);
  this.restartAutoplay();  
}


  private restartAutoplay(): void {
  if (this.slideInterval) {
    clearInterval(this.slideInterval);
  }
  if (typeof window === 'undefined') return;
  this.slideInterval = window.setInterval(() => {
    this.nextSlide(false); 
  }, 6000);
}
  selectCategory(category: CategoryOption): void {
    this.selectedCategory.set(category);

    this.fetchServiceOfferings();
  }

  private fetchServiceOfferings(): void {
    this.loading.set(true);

    this.workerService.getServiceOfferingsByCategory(this.selectedCategory().value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (serviceOfferings) => {
        this.serviceOfferings.set(serviceOfferings);
        this.loading.set(false);
      },

      error: () => {
        this.serviceOfferings.set([]);
        this.loading.set(false);
      },
    });
  }

  heroPrimaryAction(): void {
    const slide = this.activeSlide();

    switch (slide) {
      case 0:
        this.router.navigate(['/workers']);
        break;

      case 1:
        this.goToWorkers();
        break;

      case 2:
        this.router.navigate(['/about']);
        break;
    }
  }

  goToServiceOffering(serviceOfferingId: number): void {
    this.router.navigate(['/services', serviceOfferingId]);
  }

  goToWorker(workerId: number): void {
    this.router.navigate(['/workers', workerId]);
  }

  goToBecomeWorker(): void {
    this.router.navigate(['/become-worker-info']);
  }

  goToWorkers(): void {
    this.router.navigate(['/workers'], {
      queryParams: {
        category: this.selectedCategory().value,
      },
    });
  }

  goToHowItWorks(): void {
    document.getElementById('how-it-works')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  goToAbout(): void {
    document.getElementById('about-fixy')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  goToCategories(): void {
    document.getElementById('featured-workers')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  isFavorite(offeringId: number): boolean {
    return this.favoriteService.isFavorite(offeringId);
  }

  toggleFavorite(offeringId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteService.toggle(offeringId);
  }
}