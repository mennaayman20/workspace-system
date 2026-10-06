import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { ProductCategoryService } from '../../services/product-category.service';
import { Product, CreateProductCommand } from '../../interfaces/product';
import { PackageIcon, PlusIcon, EditIcon, TrashIcon, SaveIcon, LucideAngularModule , XIcon , FolderTreeIcon } from 'lucide-angular';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule , LucideAngularModule , RouterLink, RouterLinkActive],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(ProductCategoryService);
private fb = inject(NonNullableFormBuilder);
readonly PackageIcon = PackageIcon;
  readonly PlusIcon = PlusIcon;
  readonly EditIcon = EditIcon;
  readonly TrashIcon = TrashIcon;
  readonly SaveIcon = SaveIcon;
    readonly XIcon = XIcon;
readonly FolderTreeIcon=FolderTreeIcon;
  isFormOpen: boolean = false;
  
  selectedProduct: Product | null = null;
errorMessage: string | null = null; // متغير لحفظ نص الخطأ
  productForm = this.fb.group({
    productCategoryId: [null as number | null, [Validators.required]],
    englishName: ['', [Validators.required]],
    description: [''],
    sku: [''],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.productService.getProducts().subscribe();
    this.categoryService.getCategories().subscribe();
  }

  onSubmit(): void {
    if (this.productForm.invalid) return;

    const command = this.productForm.getRawValue() as CreateProductCommand;

    if (this.selectedProduct) {
      this.productService
        .updateProduct(this.selectedProduct.id, command)
        .subscribe({ next: () => this.resetForm() });
    } else {
      this.productService
        .createProduct(command)
        .subscribe({ next: () => this.resetForm() });
    }
  }

editProduct(product: any) {
    this.selectedProduct = product;
    this.productForm.patchValue(product);
    this.isFormOpen = true; // فتح الفورم عند الضغط على تعديل
  }

  deleteProduct(id: number): void {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      this.productService.deleteProduct(id).subscribe();
    }
  }
  

resetForm() {
    this.selectedProduct = null;
    this.productForm.reset({ isActive: true });
    this.isFormOpen = false;
  }

  openAddForm() {
    this.resetForm();
    this.isFormOpen = true;
  }

private handleError(error: HttpErrorResponse): void {
    if (typeof error.error === 'string') {
      this.errorMessage = error.error;
    } else if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.error?.title) {
      this.errorMessage = error.error.title;
    } else {
      this.errorMessage = 'حدث خطأ أثناء التواصل مع السيرفر، يرجى المحاولة لاحقاً.';
    }
  }









}