import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LucideAngularModule, FolderTree, X, Save, FileText } from 'lucide-angular';

import { ProductCategoryService } from '../../services/product-category.service';
import { ProductCategory, CreateProductCategoryCommand } from '../../interfaces/product';
import { Observable } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, InputTextModule, TextareaModule, ToggleSwitchModule , TranslatePipe],
  templateUrl: './category-form-modal.component.html'
})
export class CategoryFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly categoryService = inject(ProductCategoryService);
  private readonly toastr = inject(ToastrService);

  category = input<ProductCategory | null>(null);
  saved = output<void>();
  closeModal = output<void>();

  readonly FolderIcon = FolderTree;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly TextIcon = FileText;

  readonly isSaving = signal(false);
  readonly isLoadingTranslations = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    isActive: [true],
  });

  get isEdit(): boolean {
    return !!this.category();
  }

  ngOnInit(): void {
    const c = this.category();
    if (!c) return;

    this.form.patchValue({
      nameAr: c.nameAr ?? '',
      nameEn: c.nameEn ?? '',
      descriptionAr: c.descriptionAr ?? '',
      descriptionEn: c.descriptionEn ?? '',
      isActive: c.isActive,
    });

    this.isLoadingTranslations.set(true);
    this.categoryService.getTranslations(c.id).subscribe({
      next: (t) => {
        this.form.patchValue(t);
        this.isLoadingTranslations.set(false);
      },
      error: () => this.isLoadingTranslations.set(false),
    });
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  submit(): void {
    if (this.isSaving() || this.isLoadingTranslations()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const command: CreateProductCategoryCommand = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      isActive: v.isActive,
    };

  const current = this.category();
const request$: Observable<unknown> = current
  ? this.categoryService.updateCategory(current.id, command)
  : this.categoryService.createCategory(command);
    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success(current ? 'تم تعديل التصنيف بنجاح' : 'تمت إضافة التصنيف بنجاح');
        this.saved.emit();
      },
      error: (err) => {
        const msg = this.extractError(err, 'فشل حفظ التصنيف');
        this.isSaving.set(false);
        this.errorMessage.set(msg);
        this.toastr.error(msg);
      },
    });
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.closeModal.emit();
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    const errors = err?.error?.errors;
    if (errors && typeof errors === 'object') {
      const first = (Object.values(errors).flat() as string[])[0];
      if (first) return first;
    }
    if (typeof err?.error?.title === 'string') return err.error.title;
    return fallback;
  }
}