import { Component, OnInit, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { ProductCategoryService } from '../../services/product-category.service';
import { Product, CreateProductCommand } from '../../interfaces/product';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form-modal.component.html'
})
export class ProductFormModalComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(ProductCategoryService);
  private fb = inject(FormBuilder);

  // Inputs / Outputs باستخدام Angular Signals API
  isOpen = input<boolean>(false);
  productToEdit = input<Product | null>(null);
  
  closeModal = output<void>();
  saved = output<void>();

  productForm = this.fb.group({
    productCategoryId: [null as number | null, [Validators.required]],
    englishName: ['', [Validators.required]],
    description: [''],
    sku: [''],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  constructor() {
    // التفاعل مع تغير المنتج المطلوب تعديله
    effect(() => {
      const prod = this.productToEdit();
      if (prod) {
        this.productForm.patchValue({
          productCategoryId: prod.productCategoryId,
          englishName: prod.englishName,
          description: prod.description || '',
          sku: prod.sku || '',
          sellingPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          isActive: prod.isActive
        });
      } else {
        this.resetForm();
      }
    });

    effect(() => {
  if (this.isOpen()) {
    this.categoryService.getCategories().subscribe();
  }
});
  }

  ngOnInit(): void {
    if (this.categoryService.categories().length === 0) {
      this.categoryService.getCategories().subscribe();
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) return;

    const command = this.productForm.value as CreateProductCommand;
    const currentProduct = this.productToEdit();

    if (currentProduct) {
      this.productService.updateProduct(currentProduct.id, command).subscribe({
        next: () => {
          this.saved.emit();
          this.onClose();
        }
      });
    } else {
      this.productService.createProduct(command).subscribe({
        next: () => {
          this.saved.emit();
          this.onClose();
        }
      });
    }
  }

  onClose(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  resetForm(): void {
    this.productForm.reset({
      productCategoryId: null,
      englishName: '',
      description: '',
      sku: '',
      sellingPrice: 0,
      costPrice: 0,
      isActive: true
    });
  }
}