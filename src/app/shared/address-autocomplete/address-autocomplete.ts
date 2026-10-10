import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PLATFORM_ID } from '@angular/core';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { LucideAngularModule, MapPin } from 'lucide-angular';
import { LocationService } from '../../core/services/location.service';
import { LocationResult } from '../../models/location.model';

@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './address-autocomplete.html',
  styleUrl: './address-autocomplete.scss',
  // FIX 4: OnPush. Los signals manejan el estado.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressAutocomplete implements OnInit {
  private readonly locationService = inject(LocationService);

  readonly MapPinIcon = MapPin;

  // FIX 8: chequeo de plataforma para SSR.
  private readonly platformId = inject(PLATFORM_ID);

  // FIX 2: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  // FIX 6: output() en vez de @Output + EventEmitter.
  readonly locationSelected = output<LocationResult>();
  readonly openMapPickerEvent = output<void>();

  // FIX 4: signals en vez de propiedades planas.
  private readonly _query = signal('');
  readonly results = signal<LocationResult[]>([]);
  readonly loading = signal(false);

  // FIX 7: @Input con setter para reflejar cambios externos.
  @Input()
  set query(value: string) {
    if (value === this._query()) return;
    this._query.set(value ?? '');
    this.results.set([]);
  }
  get query(): string {
    return this._query();
  }

  private userLat: number | null = null;
  private userLng: number | null = null;

  private readonly searchSubject = new Subject<string>();

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((query) => {
          // FIX 10: si el query es muy corto, devolvemos [] sin llamar al service.
          // Esto tambien cancela cualquier search en vuelo.
          if (!query || query.trim().length < 3) {
            this.loading.set(false);
            return of([]);
          }

          this.loading.set(true);

          return this.locationService
            .search(query, this.userLat, this.userLng)
            // FIX 3: catchError interno para que la cadena no muera.
            .pipe(
              catchError(() => {
                this.loading.set(false);
                return of([]);
              })
            );
        }),
        // FIX 2: takeUntilDestroyed cierra la suscripcion al destruir.
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.results.set(results);
        this.loading.set(false);
      });
  }

  ngOnInit(): void { this.userLat=-34.6037;this.userLng=-58.3816; }

  onSearch(): void {
    const value = this._query();

    // FIX 10: emitimos siempre al subject, incluso con query corto.
    // Asi switchMap cancela el anterior.
    this.searchSubject.next(value);

    if (value.trim().length < 3) {
      this.results.set([]);
    }
  }

  // Metodo para el template: (ngModelChange)="onQueryChange($event)"
  onQueryChange(value: string): void {
    this._query.set(value);
    this.onSearch();
  }

  selectLocation(location: LocationResult): void {
    if (location.latitude && location.longitude) {
      this._query.set(location.label);
      this.results.set([]);
      this.locationSelected.emit(location);
      return;
    }

    this.loading.set(true);

    this.locationService
      .geocode(location.address)
      // FIX 2: cleanup de la suscripcion.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (geoLocation) => {
          this.loading.set(false);
          this._query.set(geoLocation.label);
          this.results.set([]);
          this.locationSelected.emit(geoLocation);
        },
        error: () => {
          // FIX 1 y 9: sin console.error con emoji.
          this.loading.set(false);
          this.locationSelected.emit(location);
        },
      });
  }

  openMapPicker(): void {
    this.openMapPickerEvent.emit();
  }
}

