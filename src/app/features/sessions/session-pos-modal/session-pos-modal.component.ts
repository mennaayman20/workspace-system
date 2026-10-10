import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LucideAngularModule, X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-angular';

import { ProductService } from '../../products/services/product.service'; // عدّلي المسارات
import { ProductCategoryService } from '../../products/services/product-category.service';
import { Product } from '../../products/interfaces/product';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { ServiceItem } from '../../services/Iservice';
import { SessionProductsService } from '../session-products.service';
import { SessionServicesService } from '../session-services.service';
import { SessionProductDto, SessionServiceDto } from '../Isessions';
import { CheckoutService } from '../checkout.service';
import { DiscountService } from '../../discount/discount.service'; // عدّلي المسار
import { Discount } from '../../discount/Idiscount'; // عدّلي المسار

type PosTab = 'products' | 'services';
type PosMode = 'edit' | 'checkout';

@Component({
  selector: 'app-session-pos-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './session-pos-modal.component.html',
})
export class SessionPosModalComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(ProductCategoryService);
  private serviceCatalog = inject(ServiceCatalogService);
  private sessionProducts = inject(SessionProductsService);
  private sessionServices = inject(SessionServicesService);
  private checkoutService = inject(CheckoutService);
  private discountService = inject(DiscountService);
  private toastr = inject(ToastrService);

  sessionId = input.required<number>();
  customerName = input<string>('');
  mode = input<PosMode>('edit');
  closeModal = output<void>();
  saved = output<void>();
  checkedOut = output<void>();

  readonly CloseIcon = X;
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;
  readonly TrashIcon = Trash2;
  readonly BagIcon = ShoppingBag;

  activeTab = signal<PosTab>('products');
  selectedCategoryId = signal<number | null>(null);

  // ===== المنتجات: النسخة الأصلية من السيرفر + النسخة المحلية =====
  originalItems = signal<SessionProductDto[]>([]);
  draftItems = signal<SessionProductDto[]>([]);

  // ===== الخدمات: نفس الفكرة =====
  originalServices = signal<SessionServiceDto[]>([]);
  draftServices = signal<SessionServiceDto[]>([]);

  isLoadingItems = signal(true);
  isSaving = signal(false);

  // ===== Checkout =====
  isCheckingOut = signal(false);
  selectedDiscountId = signal<number | null>(null);

  isBusy = computed(() => this.isSaving() || this.isCheckingOut());

  // الخصومات المتاحة: فعّالة، مش محذوفة، وفي نطاق التاريخ
  availableDiscounts = computed(() => {
    const now = Date.now();
    return this.discountService.discounts().filter((d) => {
      if (!d.isActive || d.isDeleted) return false;
      if (d.startDate && new Date(d.startDate).getTime() > now) return false;
      if (d.endDate && new Date(d.endDate).getTime() < now) return false;
      return true;
    });
  });

  selectedDiscount = computed<Discount | null>(
    () => this.availableDiscounts().find((d) => d.id === this.selectedDiscountId()) ?? null
  );

  discountAmount = computed(() => {
    const d = this.selectedDiscount();
    if (!d) return 0;
    const total = this.grandTotal();
    const amount = d.type === 'Percentage' ? (total * d.value) / 100 : d.value;
    return Math.min(amount, total);
  });

  netTotal = computed(() => this.grandTotal() - this.discountAmount());

  categories = computed(() => this.categoryService.categories().filter((c) => c.isActive !== false));

  products = computed(() => {
    const catId = this.selectedCategoryId();
    if (catId === null) return [];
    return this.productService
      .products()
      .filter((p) => p.productCategoryId === catId && p.isActive);
  });

  // الخدمات المتاحة للاختيار (الفعّالة وغير المحذوفة فقط)
  availableServices = computed(() =>
    this.serviceCatalog.services().filter((s) => s.isActive && !s.isDeleted)
  );

  productsTotal = computed(() =>
    this.draftItems().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );

  servicesTotal = computed(() =>
    this.draftServices().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );

  grandTotal = computed(() => this.productsTotal() + this.servicesTotal());

  // فيه تغييرات محتاجة حفظ؟
  private productsChanged = computed(() =>
    this.isDifferent(
      this.originalItems().map((i) => [i.productId, i.quantity] as [number, number]),
      this.draftItems().map((i) => [i.productId, i.quantity] as [number, number])
    )
  );

  private servicesChanged = computed(() =>
    this.isDifferent(
      this.originalServices().map((i) => [i.serviceId, i.quantity] as [number, number]),
      this.draftServices().map((i) => [i.serviceId, i.quantity] as [number, number])
    )
  );

  hasChanges = computed(() => this.productsChanged() || this.servicesChanged());

  ngOnInit() {
    if (this.mode() === 'edit') {
      // كتالوج المنتجات والخدمات محتاجينه في وضع التعديل بس
      if (this.productService.products().length === 0) this.productService.getProducts().subscribe();
      if (this.categoryService.categories().length === 0) this.categoryService.getCategories().subscribe();
      if (this.serviceCatalog.services().length === 0) this.serviceCatalog.getServices().subscribe();
    } else {
      // وضع الإنهاء: محتاجين الخصومات
      this.discountService.getDiscounts().subscribe();
    }

    this.loadSessionItems();
  }

  setTab(tab: PosTab) {
    this.activeTab.set(tab);
  }

  selectCategory(id: number) {
    this.selectedCategoryId.set(id);
  }

  onDiscountChange(value: string) {
    this.selectedDiscountId.set(value ? Number(value) : null);
  }

  // الـ GET الوحيد: عند الفتح (أو بعد فشل الحفظ عشان نرجع للحالة الحقيقية)
  private loadSessionItems() {
    this.isLoadingItems.set(true);
    const sid = this.sessionId();

    // كل واحد بيتحمل لوحده: لو الخدمات فشلت، المنتجات تفضل شغالة (والعكس)
    forkJoin({
      products: this.sessionProducts.getSessionProducts(sid).pipe(
        catchError(() => {
          this.toastr.error('تعذر تحميل منتجات الجلسة');
          return of([] as SessionProductDto[]);
        })
      ),
      services: this.sessionServices.getSessionServices(sid).pipe(
        catchError(() => {
          this.toastr.error('تعذر تحميل خدمات الجلسة');
          return of([] as SessionServiceDto[]);
        })
      ),
    }).subscribe(({ products, services }) => {
      this.originalItems.set(products);
      this.draftItems.set(products.map((i) => ({ ...i })));
      this.originalServices.set(services);
      this.draftServices.set(services.map((i) => ({ ...i })));
      this.isLoadingItems.set(false);
    });
  }

  // ===== المنتجات: تعديلات محلية (من غير requests) =====
  quantityOf(productId: number): number {
    return this.draftItems().find((i) => i.productId === productId)?.quantity ?? 0;
  }

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

  // ===== الخدمات: تعديلات محلية (من غير requests) =====
  serviceQuantityOf(serviceId: number): number {
    return this.draftServices().find((i) => i.serviceId === serviceId)?.quantity ?? 0;
  }

  addService(s: ServiceItem) {
    this.draftServices.update((list) => {
      const exists = list.some((i) => i.serviceId === s.id);
      if (exists) {
        return list.map((i) => (i.serviceId === s.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...list, { serviceId: s.id, serviceName: s.name, unitPrice: s.price, quantity: 1 }];
    });
  }

  changeServiceQuantity(item: SessionServiceDto, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.removeService(item.serviceId);
      return;
    }
    this.draftServices.update((list) =>
      list.map((i) => (i.serviceId === item.serviceId ? { ...i, quantity: newQty } : i))
    );
  }

  removeService(serviceId: number) {
    this.draftServices.update((list) => list.filter((i) => i.serviceId !== serviceId));
  }

  clearAllServices() {
    this.draftServices.set([]);
  }

  // ===== الحفظ: نبعت الفرق بس مرة واحدة (منتجات + خدمات مع بعض) =====
  save() {
    if (!this.hasChanges()) {
      this.closeModal.emit();
      return;
    }

    const calls: Observable<void>[] = [
      ...this.buildProductCalls(),
      ...this.buildServiceCalls(),
    ];

    if (calls.length === 0) {
      this.closeModal.emit();
      return;
    }

    this.isSaving.set(true);
    forkJoin(calls).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success('تم حفظ منتجات وخدمات الجلسة');
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastr.error(err?.error?.message || 'فشل حفظ بعض العناصر');
        // بعض الطلبات ممكن تكون نجحت، فنرجع للحالة الحقيقية من السيرفر
        this.loadSessionItems();
      },
    });
  }

  // ===== إنهاء الجلسة وتحصيل الفاتورة =====
  // POST /api/Checkout/sessions/{sessionId}
  confirmCheckout() {
    this.isCheckingOut.set(true);
    this.checkoutService
      .checkoutSession(this.sessionId(), {
        discountId: this.selectedDiscountId(),
        taxRate: null,
      })
      .subscribe({
        next: (res: any) => {
          this.isCheckingOut.set(false);
          if (res?.succeeded === false) {
            this.toastr.error(res?.message || 'فشل إنهاء الجلسة');
            return;
          }
          this.toastr.success('تم إنهاء الجلسة وتحصيل الفاتورة بنجاح');
          this.checkedOut.emit();
          this.closeModal.emit();
        },
        error: (err) => {
          this.isCheckingOut.set(false);
          this.toastr.error(err?.error?.message || 'فشل إنهاء الجلسة');
        },
      });
  }

  private buildProductCalls(): Observable<void>[] {
    if (!this.productsChanged()) return [];

    const sid = this.sessionId();
    const original = this.originalItems();
    const draft = this.draftItems();
    const origMap = new Map(original.map((i) => [i.productId, i.quantity]));
    const draftIds = new Set(draft.map((i) => i.productId));
    const calls: Observable<void>[] = [];

    if (draft.length === 0 && original.length > 0) {
      // مسحنا كله: DELETE واحد بدل DELETE لكل منتج
      calls.push(this.sessionProducts.clearProducts(sid));
      return calls;
    }

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
    return calls;
  }

  private buildServiceCalls(): Observable<void>[] {
    if (!this.servicesChanged()) return [];

    const sid = this.sessionId();
    const original = this.originalServices();
    const draft = this.draftServices();
    const origMap = new Map(original.map((i) => [i.serviceId, i.quantity]));
    const draftIds = new Set(draft.map((i) => i.serviceId));
    const calls: Observable<void>[] = [];

    if (draft.length === 0 && original.length > 0) {
      calls.push(this.sessionServices.clearServices(sid));
      return calls;
    }

    for (const d of draft) {
      const oldQty = origMap.get(d.serviceId);
      if (oldQty === undefined) {
        calls.push(this.sessionServices.addService(sid, d.serviceId, d.quantity));
      } else if (oldQty !== d.quantity) {
        calls.push(this.sessionServices.updateService(sid, d.serviceId, d.quantity));
      }
    }
    for (const o of original) {
      if (!draftIds.has(o.serviceId)) {
        calls.push(this.sessionServices.removeService(sid, o.serviceId));
      }
    }
    return calls;
  }

  // مقارنة قايمتين من [id, quantity]
  private isDifferent(orig: [number, number][], draft: [number, number][]): boolean {
    if (orig.length !== draft.length) return true;
    const origMap = new Map(orig);
    return draft.some(([id, qty]) => origMap.get(id) !== qty);
  }
}