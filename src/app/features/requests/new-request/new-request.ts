import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Category } from '../../../models/enums/category.enum';

@Component({
  selector: 'app-new-request',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './new-request.html',
  styleUrl: './new-request.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewRequestComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly categories = Object.values(Category);

  readonly requestForm = this.fb.group({
    title: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    }),

    description: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),

    category: this.fb.control<Category | null>(null, {
      validators: [Validators.required],
    }),
  });

  constructor(){const params=inject(ActivatedRoute).snapshot.queryParamMap;const title=params.get('title');const category=params.get('category');if(title)this.requestForm.controls.title.setValue(title.slice(0,100));if(category&&this.categories.includes(category as Category))this.requestForm.controls.category.setValue(category as Category);}
  submit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const { title, description, category } = this.requestForm.getRawValue();

    if (!category) {
      this.requestForm.controls.category.markAsTouched();
      return;
    }

    this.router.navigate(['/requests/publish'], {
      state: {
        request: {
          title: title.trim(),
          description: description.trim(),
          category,
        },
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/requests/my']);
  }
}
