import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable } from 'rxjs';
import { LucideAngularModule, X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-angular';

import { ProductService } from '../../products/services/product.service'; // عدّلي المسارات
import { ProductCategoryService } from '../../products/services/product-category.service';
import { Product } from '../../products/interfaces/product';
import { SessionProductsService } from '../session-products.service';
import { SessionProductDto } from '../Isessions';

@Component({
  selector: 'app-session-pos-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './session-pos-modal.component.html',
})
export class SessionPosModalComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(ProductCategoryService);
  private sessionProducts = inject(SessionProductsService);
  private toastr = inject(ToastrService);

  sessionId = input.required<number>();
  customerName = input<string>('');
  closeModal = output<void>();
  saved = output<void>();

  readonly CloseIcon = X;
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;
  readonly TrashIcon = Trash2;
  readonly BagIcon = ShoppingBag;

  selectedCategoryId = signal<number | null>(null);

  // النسخة الأصلية من السيرفر (للمقارنة) والنسخة المحلية اللي بنعدّل عليها
  originalItems = signal<SessionProductDto[]>([]);
  draftItems = signal<SessionProductDto[]>([]);

  isLoadingItems = signal(true);
  isSaving = signal(false);

  categories = computed(() => this.categoryService.categories().filter((c) => c.isActive !== false));

  products = computed(() => {
    const catId = this.selectedCategoryId();
    if (catId === null) return [];
    return this.productService
      .products()
      .filter((p) => p.productCategoryId === catId && p.isActive);
  });

  itemsTotal = computed(() =>
    this.draftItems().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );

  // فيه تغييرات محتاجة حفظ؟
  hasChanges = computed(() => {
    const orig = this.originalItems();
    const draft = this.draftItems();
    if (orig.length !== draft.length) return true;
    const origMap = new Map(orig.map((i) => [i.productId, i.quantity]));
    return draft.some((d) => origMap.get(d.productId) !== d.quantity);
  });

  ngOnInit() {
    if (this.productService.products().length === 0) this.productService.getProducts().subscribe();
    if (this.categoryService.categories().length === 0) this.categoryService.getCategories().subscribe();

    this.loadSessionItems();
  }

  selectCategory(id: number) {
    this.selectedCategoryId.set(id);
  }

  // الـ GET الوحيد: عند الفتح (أو بعد فشل الحفظ عشان نرجع للحالة الحقيقية)
  private loadSessionItems() {
    this.isLoadingItems.set(true);
    this.sessionProducts.getSessionProducts(this.sessionId()).subscribe({
      next: (items) => {
        this.originalItems.set(items);
        this.draftItems.set(items.map((i) => ({ ...i })));
        this.isLoadingItems.set(false);
      },
      error: () => {
        this.isLoadingItems.set(false);
        this.toastr.error('تعذر تحميل منتجات الجلسة');
      },
    });
  }

  quantityOf(productId: number): number {
    return this.draftItems().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  // ===== تعديلات محلية (من غير requests) =====
  addProduct(p: Product) {
    this.draftItems.update((list) => {
      const exists = list.some((i) => i.productId === p.id);
      if (exists) {
        return list.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...list,
        { productId: p.id, productName: p.englishName, unitPrice: p.sellingPrice, quantity: 1 },
      ];
    });
  }

  changeQuantity(item: SessionProductDto, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.remove(item.productId);
      return;
    }
    this.draftItems.update((list) =>
      list.map((i) => (i.productId === item.productId ? { ...i, quantity: newQty } : i))
    );
  }

  remove(productId: number) {
    this.draftItems.update((list) => list.filter((i) => i.productId !== productId));
  }

  clearAll() {
    this.draftItems.set([]);
  }

  // ===== الحفظ: نبعت الفرق بس مرة واحدة =====
  save() {
    if (!this.hasChanges()) {
      this.closeModal.emit();
      return;
    }

    const sid = this.sessionId();
    const original = this.originalItems();
    const draft = this.draftItems();
    const origMap = new Map(original.map((i) => [i.productId, i.quantity]));
    const draftIds = new Set(draft.map((i) => i.productId));

    const calls: Observable<void>[] = [];

    if (draft.length === 0 && original.length > 0) {
      // مسحنا كله: DELETE واحد بدل DELETE لكل منتج
      calls.push(this.sessionProducts.clearProducts(sid));
    } else {
      for (const d of draft) {
        const oldQty = origMap.get(d.productId);
        if (oldQty === undefined) {
          calls.push(this.sessionProducts.addProduct(sid, d.productId, d.quantity));
        } else if (oldQty !== d.quantity) {
          calls.push(this.sessionProducts.updateQuantity(sid, d.productId, d.quantity));
        }
      }
      for (const o of original) {
        if (!draftIds.has(o.productId)) {
          calls.push(this.sessionProducts.removeProduct(sid, o.productId));
        }
      }
    }

    this.isSaving.set(true);
    forkJoin(calls).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success('تم حفظ منتجات الجلسة');
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastr.error(err?.error?.message || 'فشل حفظ بعض المنتجات');
        // بعض الطلبات ممكن تكون نجحت، فنرجع للحالة الحقيقية من السيرفر
        this.loadSessionItems();
      },
    });
  }
}