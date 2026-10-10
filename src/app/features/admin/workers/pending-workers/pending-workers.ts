import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';

import { Check, LucideAngularModule, RefreshCw, X } from 'lucide-angular';

import { environment } from '../../../../../environments/environment';
import { WorkerProfile } from '../../../../models/worker.profile.model';
import { Category } from '../../../../models/enums/category.enum';

@Component({
  selector: 'app-pending-workers',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './pending-workers.html',
  styleUrl: './pending-workers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingWorkersComponent implements OnInit {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/worker/admin`;

  readonly workers = signal<WorkerProfile[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly processingWorkerIds = signal<Set<number>>(new Set());

  readonly icons = {
    Check,
    RefreshCw,
    X,
  };

  ngOnInit(): void {
    this.loadPendingWorkers();
  }

  loadPendingWorkers(): void {
    this.loading.set(true);
    this.error.set(false);

    this.http
      .get<WorkerProfile[]>(`${this.apiUrl}/pending`)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (workers) => {
          this.workers.set(workers);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  approveWorker(workerId: number): void {
    this.setProcessing(workerId, true);

    this.http
      .patch<WorkerProfile>(`${this.apiUrl}/${workerId}/approve`, {})
      .pipe(
        finalize(() => {
          this.setProcessing(workerId, false);
        }),
      )
      .subscribe({
        next: () => {
          this.removeWorker(workerId);
        },
        error: () => {
          // El worker permanece en la lista si la operación falla.
        },
      });
  }

  rejectWorker(workerId: number): void {
    this.setProcessing(workerId, true);

    this.http
      .patch<WorkerProfile>(`${this.apiUrl}/${workerId}/reject`, {})
      .pipe(
        finalize(() => {
          this.setProcessing(workerId, false);
        }),
      )
      .subscribe({
        next: () => {
          this.removeWorker(workerId);
        },
        error: () => {
          // El worker permanece en la lista si la operación falla.
        },
      });
  }

  isProcessing(workerId: number): boolean {
    return this.processingWorkerIds().has(workerId);
  }

  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private setProcessing(workerId: number, processing: boolean): void {
    const current = new Set(this.processingWorkerIds());

    if (processing) {
      current.add(workerId);
    } else {
      current.delete(workerId);
    }

    this.processingWorkerIds.set(current);
  }

  private removeWorker(workerId: number): void {
    this.workers.update((workers) => workers.filter((worker) => worker.id !== workerId));
  }
}
