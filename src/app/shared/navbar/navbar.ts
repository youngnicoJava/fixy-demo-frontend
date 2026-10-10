import {
  ChangeDetectionStrategy,
  afterNextRender,
  DestroyRef,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../models/enums/Role.enum';

import { CATEGORIES, CategoryOption } from '../constants/categories';

import { AddressSelectorComponent } from '../address-selector/address-selector';

import { FavoriteService } from '../../core/services/favorite.service';

import {
  Search,
  User,
  ChevronDown,
  Briefcase,
  ShieldCheck,
  Bell,
  LucideAngularModule,
  Wrench,
  Heart,
} from 'lucide-angular';

import { AuthModalService } from '../../core/services/auth.modal.service';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddressSelectorComponent,
    LucideAngularModule,
    NgIconComponent,
    RouterLink,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  // =========================================================
  // ICONS
  // =========================================================

  constructor() {
    afterNextRender(() => {
      const navbar = this.elementRef.nativeElement.querySelector('.navbar') as HTMLElement | null;
      if (!navbar) return;
      const measure = () => {
        const height = Math.ceil(navbar.getBoundingClientRect().height);
        if (height > 0 && !this.scrolled())
          this.document.documentElement.style.setProperty('--fixy-navbar-height', height + 'px');
      };
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(navbar);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
    });
  }
  readonly SearchIcon = Search;
  readonly UserIcon = User;
  readonly ChevronDownIcon = ChevronDown;
  readonly BriefcaseIcon = Briefcase;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly BellIcon = Bell;
  readonly WrenchIcon = Wrench;
  readonly HeartIcon = Heart;

  // =========================================================
  // DEPENDENCY INJECTION
  // =========================================================

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly elementRef = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authModal = inject(AuthModalService);

  // FIX 5: private en vez de protected.
  // Solo exponemos lo necesario al template (favoritesCount, favorites).
  private readonly favoriteService = inject(FavoriteService);

  // =========================================================
  // DATA
  // =========================================================

  readonly categories = CATEGORIES;
  readonly Role = Role;

  readonly currentUser$ = this.authService.currentUser$;

  // FIX 5: exponemos solo lo que el template necesita del FavoriteService.
  // favoritesCount es un computed que devuelve el size del Set.
  // Asi el template no necesita saber si es Set, Array, o Map.
  readonly favoritesCount = this.favoriteService.favoritesCount;
  readonly favorites = this.favoriteService.favorites;

  // =========================================================
  // SEARCH STATE
  // =========================================================

  readonly selectedCategory = signal<CategoryOption | null>(null);

  readonly searchTerm = signal('');

  readonly suggestionsOpen = signal(false);

  readonly suggestedServices = computed(() => {
    const services = this.selectedCategory()?.commonServices ?? [];
    const query = this.searchTerm().trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) => {
      const normalizedService = service.trim().toLowerCase();

      return normalizedService.includes(query) && normalizedService !== query;
    });
  });

  goToHome(event: MouseEvent): void {
    event.preventDefault();

    if (this.router.url === '/home') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    this.router.navigate(['/home']).then(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  }

  @ViewChild('serviceSearchInput')
  private serviceSearchInput?: ElementRef<HTMLInputElement>;

  // =========================================================
  // MENU STATE
  // =========================================================

  readonly categoryOpen = signal(false);
  readonly userMenuOpen = signal(false);

  @ViewChild(AddressSelectorComponent)
  private addressSelector?: AddressSelectorComponent;

  // =========================================================
  // NAVBAR STATE
  // =========================================================

  readonly scrolled = signal(false);

  // FIX 3: isAuthenticated como computed en vez de getter.
  // Antes era un getter que se ejecutaba en cada ciclo de deteccion.
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  // =========================================================
  // SCROLL
  // =========================================================

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const triggerPoint = window.innerHeight * 0.35;

    this.scrolled.set(window.scrollY > triggerPoint);
  }

  // =========================================================
  // CATEGORY MENU
  // =========================================================

  toggleCategoryPanel(): void {
    this.addressSelector?.closeDropdown();

    this.categoryOpen.update((value) => !value);

    this.userMenuOpen.set(false);
    this.suggestionsOpen.set(false);

    if (this.categoryOpen()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectCategory(category: CategoryOption): void {
    const currentCategory = this.selectedCategory();

    // Si tocamos la misma categoria, la deseleccionamos.
    if (currentCategory?.value === category.value) {
      this.selectedCategory.set(null);
      this.searchTerm.set('');
      this.categoryOpen.set(false);
      this.suggestionsOpen.set(false);

      return;
    }

    // Nueva categoria.
    this.selectedCategory.set(category);
    this.searchTerm.set('');

    this.categoryOpen.set(false);
    this.suggestionsOpen.set(true);

    queueMicrotask(() => {
      this.serviceSearchInput?.nativeElement.focus();
    });
  }

  // =========================================================
  // SERVICE SUGGESTIONS
  // =========================================================

  selectSuggestedService(service: string): void {
    this.searchTerm.set(service);
    this.suggestionsOpen.set(false);

    queueMicrotask(() => {
      this.serviceSearchInput?.nativeElement.focus();
    });
  }

  // =========================================================
  // USER MENU
  // =========================================================

  toggleUserMenu(): void {
    this.addressSelector?.closeDropdown();

    this.userMenuOpen.update((value) => !value);

    this.categoryOpen.set(false);
    this.suggestionsOpen.set(false);
  }

  // =========================================================
  // CLOSE NAVBAR MENUS
  // =========================================================

  closeNavbarMenus(): void {
    this.categoryOpen.set(false);
    this.userMenuOpen.set(false);
    this.suggestionsOpen.set(false);
  }

  // =========================================================
  // SEARCH
  // =========================================================

  handleSearch(): void {
    const category = this.selectedCategory();

    if (!category) {
      return;
    }

    this.router.navigate(['/service-offerings'], {
      queryParams: {
        category: category.value,
        q: this.searchTerm().trim(),
      },
    });

    this.categoryOpen.set(false);
    this.suggestionsOpen.set(false);
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goTo(path: string): void {
    this.router.navigate([path]);

    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.suggestionsOpen.set(false);
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {
    this.authService.logout();

    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.suggestionsOpen.set(false);

    this.router.navigate(['/login']);
  }

  // =========================================================
  // DOCUMENT CLICK
  // =========================================================

  // FIX 4: simplificado. Antes duplicaba los set(false) en dos ramas.
  // Ahora usa closeNavbarMenus() una sola vez.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const clickedAddressSelector = target.closest('.address-selector');
    const clickedInsideNavbar = this.elementRef.nativeElement.contains(target);

    // Si clickeo en el address-selector, cerramos los menus del navbar
    // pero no tocamos su estado (lo maneja el mismo).
    // Si clickeo fuera del navbar, cerramos todo.
    if (clickedAddressSelector || !clickedInsideNavbar) {
      this.closeNavbarMenus();
    }
  }

  // FIX 10: mostrar sugerencias solo con 2+ caracteres.
  // Antes se mostraban en la primera letra, lo cual es ruidoso.
  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);

    const hasSuggestions = this.suggestedServices().length > 0;
    const shouldShow = value.trim().length >= 2 && hasSuggestions;

    this.suggestionsOpen.set(shouldShow);
  }
}
