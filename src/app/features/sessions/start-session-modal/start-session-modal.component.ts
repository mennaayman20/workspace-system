import {
  Component, OnInit, EventEmitter, Output, DestroyRef, inject, signal, computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import {
  LucideAngularModule, X, UserPlus, Play, Search, Loader2, User, Building2, Tag, Phone, Mail, Users,
} from 'lucide-angular';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { SessionsService } from '../sessions.service';
import { CustomerService } from '../../customers/customer.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { EmployeeService } from '../../employee/employee.service';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف

import { StartSessionCommand } from '../Isessions';
import { Customer, CreateCustomerDto } from '../../customers/Icustomer';
import { Workspace } from '../../../core/interfaces/Iworkspace';
import { PricingPlan } from '../../pricing/Ipricing';
import { Employee } from '../../employee/Iimployee';

@Component({
  selector: 'app-start-session-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule, LucideAngularModule, SelectModule, InputTextModule, TranslatePipe,
  ],
  templateUrl: './start-session-modal.component.html'
})
export class StartSessionModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private sessionsService = inject(SessionsService);
  private customerService = inject(CustomerService);
  private workspaceService = inject(WorkspaceService);
  private pricingPlanService = inject(PricingPlanService);
  private employeeService = inject(EmployeeService);
  private lang = inject(LanguageService);

  @Output() closeModal = new EventEmitter<void>();
  @Output() sessionStarted = new EventEmitter<void>();

  readonly XIcon = X;
  readonly UserPlusIcon = UserPlus;
  readonly PlayIcon = Play;
  readonly SearchIcon = Search;
  readonly LoaderIcon = Loader2;
  readonly UserIcon = User;
  readonly WorkspaceIcon = Building2;
  readonly PlanIcon = Tag;
  readonly PhoneIcon = Phone;
  readonly MailIcon = Mail;
  readonly PeopleIcon = Users;

  // حالات التحميل منفصلة
  isSubmitting = signal(false);
  isSavingCustomer = signal(false);
  isSearchingCustomers = signal(false);

  errorMessage = signal<string | null>(null);
  quickError = signal<string | null>(null);

  customersList = signal<Customer[]>([]);
  employeesList = signal<Employee[]>([]);
  workspacesList = signal<Workspace[]>([]);
  pricingPlansList = signal<PricingPlan[]>([]);

  isQuickAddCustomerOpen = signal(false);
  searchTerm = signal('');
  private searchSubject = new Subject<string>();

  /** خيارات العملاء للـ p-select (الاسم المترجم + الموبايل) */
  readonly customerOptions = computed(() =>
    this.customersList().map(c => ({
      id: c.id,
      name: c.fullName || c.fullNameAr || c.fullNameEn || '',
      mobile: c.mobileNumber,
    }))
  );

  sessionForm: FormGroup = this.fb.group({
    customerId: [null, [Validators.required]],
    employeeId: [null, [Validators.required]],
    bookingId: [null],
    workspaceId: [null, [Validators.required]],
    pricingPlanId: [null, [Validators.required]],
    numberOfPeople: [1, [Validators.required, Validators.min(1)]]
  });

  // الاسكيما الجديدة: اسم عربي + اسم إنجليزي
  quickCustomerForm: FormGroup = this.fb.group({
    fullNameAr: ['', [Validators.required, Validators.minLength(3)]],
    fullNameEn: ['', [Validators.required, Validators.minLength(3)]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^\+?\d{10,15}$/)]],
    email: ['', [Validators.email]],
  });

  // ===== Getters للتمبلت =====
  get selectedWorkspace(): Workspace | undefined {
    const id = Number(this.sessionForm.value.workspaceId);
    return this.workspacesList().find(w => Number(w.id) === id);
  }

  get people(): number {
    return Number(this.sessionForm.value.numberOfPeople) || 1;
  }

  invalid(form: FormGroup, name: string): boolean {
    const c = form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupCustomerSearch();
  }

  // يفك الـ wrapper سواء المصفوفة جاية مباشرة أو جوه data/items
  private unwrapList<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.error?.title === 'string') return err.error.title;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }

  private loadInitialData(): void {
    this.employeeService.getEmployees().subscribe({
      next: (res: any) => this.employeesList.set(this.unwrapList<Employee>(res)),
      error: () => this.employeesList.set([])
    });

    this.customerService.getCustomers(1, 10).subscribe({
      next: (res: any) => this.customersList.set(this.unwrapList<Customer>(res)),
      error: () => this.customersList.set([])
    });

    this.workspaceService.getWorkspaces().subscribe({
      next: (res: any) => this.workspacesList.set(this.unwrapList<Workspace>(res)),
      error: () => this.workspacesList.set([])
    });

    this.pricingPlanService.getPlans().subscribe({
      next: (res: any) => this.pricingPlansList.set(this.unwrapList<PricingPlan>(res)),
      error: () => this.pricingPlansList.set([])
    });
  }

  private setupCustomerSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
        this.isSearchingCustomers.set(true);
        const req$: Observable<any> = term.trim()
          ? this.customerService.searchCustomers(term.trim(), 1, 10)
          : this.customerService.getCustomers(1, 10);
        // catchError هنا عشان الـ stream مايموتش بعد أول error
        return req$.pipe(catchError(() => of([])));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res: any) => {
      this.customersList.set(this.unwrapList<Customer>(res));
      this.isSearchingCustomers.set(false);
    });
  }

  onSearchCustomer(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  toggleQuickAddCustomer(): void {
    this.quickError.set(null);
    this.isQuickAddCustomerOpen.update(v => !v);
  }

  // ===== إضافة عميل سريع واختياره =====
  saveQuickCustomer(): void {
    if (this.quickCustomerForm.invalid) {
      this.quickCustomerForm.markAllAsTouched();
      return;
    }
    if (this.isSavingCustomer()) return;

    const v = this.quickCustomerForm.getRawValue();
    const dto: CreateCustomerDto = {
      fullNameAr: (v.fullNameAr ?? '').trim(),
      fullNameEn: (v.fullNameEn ?? '').trim(),
      mobileNumber: (v.mobileNumber ?? '').trim(),
      email: v.email?.trim() || null,
      companyId: null,
      customerType: 'Individual',
      notes: null,
    };

    this.isSavingCustomer.set(true);
    this.quickError.set(null);

    this.customerService.createCustomer(dto).subscribe({
      next: (res: any) => {
        // الـ API بترجّع الـ id في res.data (أو object فيه id)
        const created = res?.data ?? res;
        const newId = Number(typeof created === 'object' ? created?.id : created);

        this.isSavingCustomer.set(false);

        if (!newId) {
          this.quickError.set(this.lang.t('SESSIONS.START_MODAL.ERR_QUICK_NO_ID'));
          return;
        }

        // نبني العميل محلياً بدل طلب تاني، والاسم المعروض حسب اللغة الحالية
        const isAr = this.lang.currentLang() === 'ar';
        const customer: Customer = {
          ...dto,
          id: newId,
          fullName: isAr ? dto.fullNameAr : dto.fullNameEn,
        };

        // 1) الأول نضيفه للقايمة  2) بعدين نختاره
        this.customersList.update(list => [customer, ...list.filter(c => Number(c.id) !== newId)]);
        this.sessionForm.patchValue({ customerId: newId });
        this.sessionForm.get('customerId')?.markAsDirty();

        this.searchTerm.set('');
        this.quickCustomerForm.reset({ fullNameAr: '', fullNameEn: '', mobileNumber: '', email: '' });
        this.isQuickAddCustomerOpen.set(false);
      },
      error: (err) => {
        this.isSavingCustomer.set(false);
        this.quickError.set(this.extractError(err, this.lang.t('SESSIONS.START_MODAL.ERR_QUICK_SAVE')));
      }
    });
  }

  // ===== عدد الأشخاص =====
  changePeople(delta: number): void {
    const max = Number(this.selectedWorkspace?.capacity) || Infinity;
    const next = Math.min(max, Math.max(1, this.people + delta));
    this.sessionForm.patchValue({ numberOfPeople: next });
  }

  // ===== بدء الجلسة =====
  onSubmit(): void {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }
    if (this.isSubmitting()) return;

    const capacity = Number(this.selectedWorkspace?.capacity);
    if (capacity && this.people > capacity) {
      this.errorMessage.set(
        this.lang.t('SESSIONS.START_MODAL.ERR_CAPACITY').replace('{{capacity}}', String(capacity))
      );
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const v = this.sessionForm.value;
    const command: StartSessionCommand = {
      customerId: Number(v.customerId),
      employeeId: Number(v.employeeId),
      bookingId: v.bookingId ? Number(v.bookingId) : null,
      workspaceId: Number(v.workspaceId),
      pricingPlanId: Number(v.pricingPlanId),
      numberOfPeople: Number(v.numberOfPeople)
    };

    this.sessionsService.startSession(command).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.sessionStarted.emit();
        this.closeModal.emit();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.extractError(err, this.lang.t('SESSIONS.START_MODAL.ERR_START')));
      }
    });
  }
}