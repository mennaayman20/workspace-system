import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LucideAngularModule, Package, X, Save, FileText, Wallet, Hash } from 'lucide-angular';

import { ProductService } from '../../services/product.service';
import { ProductCategoryService } from '../../services/product-category.service';
import { Product, CreateProductCommand } from '../../interfaces/product';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule, SelectModule, ToggleSwitchModule,
  ],
  templateUrl: './product-form-modal.component.html'
})
export class ProductFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(ProductCategoryService);
  private readonly toastr = inject(ToastrService);

  product = input<Product | null>(null);
  saved = output<void>();
  closeModal = output<void>();

  readonly PackageIcon = Package;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly TextIcon = FileText;
  readonly WalletIcon = Wallet;
  readonly HashIcon = Hash;

  readonly isSaving = signal(false);
  readonly isLoadingTranslations = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly categoryOptions = computed(() =>
    this.categoryService.categories().map((c) => ({
      id: c.id,
      label: c.name || c.nameAr || c.nameEn || `#${c.id}`,
    })),
  );

readonly form = this.fb.group({
  productCategoryId: this.fb.control<number | null>(null, Validators.required),
  nameAr: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
  nameEn: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
  descriptionAr: ['', [Validators.maxLength(500)]],
  descriptionEn: ['', [Validators.maxLength(500)]],
  sku: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^(?!\s*$).+/)]],
  sellingPrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
  costPrice: this.fb.control<number | null>(null, [Validators.min(0)]),
  isActive: [true],
});

  get isEdit(): boolean {
    return !!this.product();
  }

  /** هامش الربح التقريبي: توضيح للمستخدم وهو بيكتب الأسعار */
  get margin(): { profit: number; pct: number; isLoss: boolean } | null {
    const sell = Number(this.form.controls.sellingPrice.value);
    const cost = Number(this.form.controls.costPrice.value) || 0;
    if (!sell || sell <= 0) return null;

    const profit = sell - cost;
    return {
      profit: Number(profit.toFixed(2)),
      pct: Number(((profit / sell) * 100).toFixed(1)),
      isLoss: profit < 0,
    };
  }

  ngOnInit(): void {
    if (this.categoryService.categories().length === 0) {
      this.categoryService.getCategories().subscribe();
    }

    const p = this.product();
    if (!p) return;

    // بيانات فورية من الـ List
    this.form.patchValue({
      productCategoryId: p.productCategoryId,
      nameAr: p.nameAr ?? '',
      nameEn: p.nameEn ?? p.englishName ?? '',
      descriptionAr: p.descriptionAr ?? '',
      descriptionEn: p.descriptionEn ?? '',
      sku: p.sku ?? '',
      sellingPrice: p.sellingPrice,
      costPrice: p.costPrice,
      isActive: p.isActive,
    });

    // الاسم والوصف باللغتين
    this.isLoadingTranslations.set(true);
    this.productService.getTranslations(p.id).subscribe({
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
    const command: CreateProductCommand = {
      productCategoryId: Number(v.productCategoryId),
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      sku: v.sku.trim() || null,
      sellingPrice: Number(v.sellingPrice),
      costPrice: Number(v.costPrice ?? 0),
      isActive: v.isActive,
    };

    const current = this.product();
const request$: Observable<unknown> = current
  ? this.productService.updateProduct(current.id, command)
  : this.productService.createProduct(command);
    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success(current ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
        this.saved.emit();
      },
      error: (err) => {
        const msg = this.extractError(err, 'فشل حفظ المنتج');
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