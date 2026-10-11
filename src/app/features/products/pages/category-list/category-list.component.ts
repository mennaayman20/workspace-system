import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule, FolderTreeIcon, PlusIcon, EditIcon, TrashIcon, PackageIcon,
} from 'lucide-angular';

import { ProductCategoryService } from '../../services/product-category.service';
import { ProductCategory } from '../../interfaces/product';
import { CategoryFormModalComponent } from '../../components/category-form-modal/category-form-modal.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule, RouterLink, RouterLinkActive,
    CategoryFormModalComponent,
  ],
  templateUrl: './category-list.component.html'
})
export class CategoryListComponent implements OnInit {
  categoryService = inject(ProductCategoryService);
  private toastr = inject(ToastrService);

  readonly FolderTreeIcon = FolderTreeIcon;
  readonly PlusIcon = PlusIcon;
  readonly EditIcon = EditIcon;
  readonly TrashIcon = TrashIcon;
  readonly PackageIcon = PackageIcon;

  // Form modal
  isFormOpen = signal<boolean>(false);
  editing = signal<ProductCategory | null>(null);

  // Delete confirmation
  pendingDelete = signal<ProductCategory | null>(null);
  isDeleting = signal<boolean>(false);

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      error: () => this.toastr.error('تعذر تحميل التصنيفات'),
    });
  }

  displayName(c: ProductCategory): string {
    return c.name || c.nameAr || c.nameEn || `#${c.id}`;
  }

  displayDescription(c: ProductCategory): string | null {
    return c.description || c.descriptionAr || c.descriptionEn || null;
  }

  // ---------- الفورم ----------
  openAddForm(): void {
    this.editing.set(null);
    this.isFormOpen.set(true);
  }

  editCategory(category: ProductCategory): void {
    this.editing.set(category);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editing.set(null);
  }

  // ---------- الحذف ----------
  askDelete(category: ProductCategory): void {
    this.pendingDelete.set(category);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const c = this.pendingDelete();
    if (!c) return;

    this.isDeleting.set(true);
    this.categoryService.deleteCategory(c.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف التصنيف بنجاح');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(
          err?.error?.message || 'تعذر حذف التصنيف، قد يكون مرتبطاً بمنتجات.'
        );
      },
    });
  }
}