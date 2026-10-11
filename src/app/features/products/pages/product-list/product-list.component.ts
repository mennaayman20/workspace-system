import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule, PackageIcon, PlusIcon, EditIcon, TrashIcon, FolderTreeIcon,
} from 'lucide-angular';

import { ProductService } from '../../services/product.service';
import { ProductCategoryService } from '../../services/product-category.service';
import { Product } from '../../interfaces/product';
import { ProductFormModalComponent } from '../../components/product-form-modal/product-form-modal.component';
import {
  CellTemplateDirective,
  DataTableComponent,
  TableAction,
  TableActionEvent,
  TableColumn,
} from '../../../../shared/components/data-table';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule, RouterLink, RouterLinkActive,
    ProductFormModalComponent, DataTableComponent, CellTemplateDirective,
  ],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(ProductCategoryService);
  private toastr = inject(ToastrService);

  readonly PackageIcon = PackageIcon;
  readonly PlusIcon = PlusIcon;
  readonly EditIcon = EditIcon;
  readonly TrashIcon = TrashIcon;
  readonly FolderTreeIcon = FolderTreeIcon;

  // ---------- إعداد الجدول ----------
  readonly columns: TableColumn<Product>[] = [
    { key: 'name', header: 'المنتج', align: 'start', cellClass: 'font-bold text-slate-900', value: (p) => this.displayName(p) },
    { key: 'sku', header: 'SKU', type: 'mono', sortable: true },
    { key: 'productCategoryName', header: 'التصنيف', sortable: true },
    { key: 'sellingPrice', header: 'سعر البيع', type: 'currency', currency: 'EGP', sortable: true },
    { key: 'isActive', header: 'الحالة', type: 'status', sortable: true },
  ];

  readonly actions: TableAction<Product>[] = [
    { key: 'edit', label: 'تعديل', icon: EditIcon, tone: 'primary' },
    { key: 'delete', label: 'حذف', icon: TrashIcon, tone: 'danger' },
  ];

  onAction(e: TableActionEvent<Product>): void {
    if (e.key === 'edit') this.editProduct(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

  // Form modal
  isFormOpen = signal<boolean>(false);
  editing = signal<Product | null>(null);

  // Delete confirmation
  pendingDelete = signal<Product | null>(null);
  isDeleting = signal<boolean>(false);

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      error: () => this.toastr.error('تعذر تحميل المنتجات'),
    });
    this.categoryService.getCategories().subscribe();
  }

  displayName(p: Product): string {
    return p.name || p.nameAr || p.nameEn || p.englishName || `#${p.id}`;
  }

  // ---------- الفورم ----------
  openAddForm(): void {
    this.editing.set(null);
    this.isFormOpen.set(true);
  }

  editProduct(product: Product): void {
    this.editing.set(product);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editing.set(null);
  }

  // ---------- الحذف ----------
  askDelete(product: Product): void {
    this.pendingDelete.set(product);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const p = this.pendingDelete();
    if (!p) return;

    this.isDeleting.set(true);
    this.productService.deleteProduct(p.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف المنتج بنجاح');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(err?.error?.message || 'تعذر حذف المنتج');
      },
    });
  }
}