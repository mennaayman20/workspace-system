import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {
  LucideAngularModule, Users, Plus, Edit3, Trash2, RotateCcw, X, User, Save, Phone, Mail, Lock,
  CheckCircle2, UserX, PauseCircle, Ban
} from 'lucide-angular';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { EmployeeService } from './employee.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { LanguageService } from '../../core/services/lang.service'; // عدّل المسار لو مختلف
import { Employee, EmployeeStatus, Gender } from './Iimployee';
import {
  BADGE,
  CellTemplateDirective,
  DataTableComponent,
  RowActionsDirective,
  TableAction,
  TableActionEvent,
  TableColumn
} from '../../shared/components/data-table';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';
import { ToBodyDirective } from '../../shared/directives/to-body.directive';

type StatusFilter = 'all' | EmployeeStatus;

interface StatCard {
  value: StatusFilter;
  labelKey: string;
  icon: any;
  /** كلاسات Tailwind لازم تتكتب كاملة عشان تتلقط في الـ build */
  border: string;
  tint: string;
  chip: string;
  ring: string;
}

const ARABIC_NAME = /^[\u0600-\u06FF\s]+$/;
const ENGLISH_NAME = /^[A-Za-z\s.'-]+$/;

const passwordStrength: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v: string = c.value ?? '';
  if (!v) return null; // required بيتكفل بالفاضي
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(v)) errors['uppercase'] = true;
  if (!/[a-z]/.test(v)) errors['lowercase'] = true;
  return Object.keys(errors).length ? errors : null;
};

const PASSWORD_VALIDATORS = [Validators.required, Validators.minLength(8), passwordStrength];
const matchPassword: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const password = c.parent?.get('password')?.value;
  return c.value && c.value !== password ? { mismatch: true } : null;
};

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    DataTableComponent,
    CellTemplateDirective,
    RowActionsDirective,
    InputTextModule,
    SelectModule,
    ConfirmDialogComponent,
    ToBodyDirective
  ],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.scss']
})
export class EmployeeComponent {
  private employeeService = inject(EmployeeService);
  private workspaceService = inject(WorkspaceService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  private lang = inject(LanguageService);

  private loadSub?: Subscription;
  private workspacesSub?: Subscription;

  // Icons
  readonly UsersIcon = Users;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly CloseIcon = X;
  readonly UserIcon = User;
  readonly SaveIcon = Save;
  readonly PhoneIcon = Phone;
  readonly MailIcon = Mail;
  readonly LockIcon = Lock;

  // Data state
  employees = signal<Employee[]>([]);
  workspaces = signal<{ id: number; name: string }[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  busyEmployeeIds = signal<Set<number>>(new Set());

  // Modal state
  isModalOpen = signal(false);
  isEditMode = signal(false);
  isFormLoading = signal(false);
  selectedEmployeeId = signal<number | null>(null);
  formError = signal<string | null>(null);

  // Delete confirmation
  pendingDelete = signal<Employee | null>(null);
  isDeleting = signal(false);

  // Quick filter (stat cards)
  statusFilter = signal<StatusFilter>('all');

  readonly statusOptions: { value: EmployeeStatus; labelKey: string }[] = [
    { value: 'Active', labelKey: 'EMPLOYEES.STATUS.ACTIVE' },
    { value: 'Inactive', labelKey: 'EMPLOYEES.STATUS.INACTIVE' },
    { value: 'Suspended', labelKey: 'EMPLOYEES.STATUS.SUSPENDED' },
    { value: 'Terminated', labelKey: 'EMPLOYEES.STATUS.TERMINATED' }
  ];

  genderOptions = computed<{ value: Gender; label: string }[]>(() => {
    this.lang.currentLang();
    return [
      { value: 'Male', label: this.lang.t('EMPLOYEES.GENDER.MALE') },
      { value: 'Female', label: this.lang.t('EMPLOYEES.GENDER.FEMALE') }
    ];
  });

  // ---------- كروت الإحصائيات ----------
  readonly statCards: StatCard[] = [
    {
      value: 'all', labelKey: 'EMPLOYEES.STATS.ALL', icon: Users,
      border: 'border-s-blue-500', tint: 'from-blue-50',
      chip: 'bg-blue-100 text-blue-600', ring: 'ring-blue-400'
    },
    {
      value: 'Active', labelKey: 'EMPLOYEES.STATUS.ACTIVE', icon: CheckCircle2,
      border: 'border-s-emerald-500', tint: 'from-emerald-50',
      chip: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-400'
    },
    {
      value: 'Inactive', labelKey: 'EMPLOYEES.STATUS.INACTIVE', icon: UserX,
      border: 'border-s-slate-500', tint: 'from-slate-100',
      chip: 'bg-slate-200 text-slate-600', ring: 'ring-slate-400'
    },
    {
      value: 'Suspended', labelKey: 'EMPLOYEES.STATUS.SUSPENDED', icon: PauseCircle,
      border: 'border-s-amber-500', tint: 'from-amber-50',
      chip: 'bg-amber-100 text-amber-600', ring: 'ring-amber-400'
    },
    {
      value: 'Terminated', labelKey: 'EMPLOYEES.STATUS.TERMINATED', icon: Ban,
      border: 'border-s-rose-500', tint: 'from-rose-50',
      chip: 'bg-rose-100 text-rose-600', ring: 'ring-rose-400'
    }
  ];

  // ---------- تعريف الجدول (computed عشان يتحدث مع اللغة) ----------
  readonly columns = computed<TableColumn<Employee>[]>(() => {
    this.lang.currentLang();
    const t = (k: string) => this.lang.t(k);
    return [
      { key: 'fullName', header: t('EMPLOYEES.COLUMNS.EMPLOYEE'), sortable: true, align: 'start' },
      { key: 'email', header: t('EMPLOYEES.COLUMNS.EMAIL'), type: 'mono', sortable: true },
      { key: 'mobileNumber', header: t('EMPLOYEES.COLUMNS.PHONE'), type: 'mono' },
      {
        key: 'assignedWorkspaceName',
        header: t('EMPLOYEES.COLUMNS.WORKSPACE'),
        fallback: t('EMPLOYEES.NOT_ASSIGNED'),
        value: e =>
          e.assignedWorkspaceName ??
          this.workspaces().find(w => w.id === e.assignedWorkspaceId)?.name
      },
      {
        key: 'status',
        header: t('EMPLOYEES.COLUMNS.STATUS'),
        type: 'badge',
        badges: {
          Active: { label: t('EMPLOYEES.STATUS.ACTIVE'), class: BADGE.green },
          Inactive: { label: t('EMPLOYEES.STATUS.INACTIVE'), class: BADGE.slate },
          Suspended: { label: t('EMPLOYEES.STATUS.SUSPENDED'), class: BADGE.amber },
          Terminated: { label: t('EMPLOYEES.STATUS.TERMINATED'), class: BADGE.red }
        }
      }
    ];
  });

  readonly actions = computed<TableAction<Employee>[]>(() => {
    this.lang.currentLang();
    const t = (k: string) => this.lang.t(k);
    return [
      {
        key: 'edit', label: t('EMPLOYEES.ACTIONS.EDIT'), icon: Edit3, tone: 'primary',
        disabled: e => this.isBusy(e.id)
      },
      {
        key: 'delete', label: t('EMPLOYEES.ACTIONS.DELETE'), icon: Trash2, tone: 'danger',
        visible: e => !this.isRemoved(e), disabled: e => this.isBusy(e.id)
      },
      {
        key: 'restore', label: t('EMPLOYEES.ACTIONS.RESTORE'), icon: RotateCcw, tone: 'success',
        visible: e => this.isRemoved(e), disabled: e => this.isBusy(e.id)
      }
    ];
  });

  readonly rowClass = (e: Employee): string =>
    this.isBusy(e.id) ? 'opacity-50 pointer-events-none' : '';

  onAction(e: TableActionEvent<Employee>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
    if (e.key === 'restore') this.onRestore(e.row);
  }

  // ---------- Form ----------
  employeeForm: FormGroup = this.fb.group({
    firstNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],
    lastNameAr: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ARABIC_NAME)]],
    firstNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],
    lastNameEn: ['', [Validators.required, Validators.minLength(2), Validators.pattern(ENGLISH_NAME)]],
    gender: [null as Gender | null, [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,15}$/)]],
   password: ['', PASSWORD_VALIDATORS],
    confirmPassword: ['', [Validators.required, matchPassword]]
  });

  // ---------- Computed ----------
  filteredEmployees = computed(() => {
    const status = this.statusFilter();
    const list = this.employees();
    return status === 'all' ? list : list.filter(e => e.status === status);
  });

  statusCounts = computed(() => {
    const counts: Record<string, number> = {
      all: this.employees().length,
      Active: 0,
      Inactive: 0,
      Suspended: 0,
      Terminated: 0
    };
    for (const emp of this.employees()) {
      if (counts[emp.status] !== undefined) counts[emp.status]++;
    }
    return counts;
  });

  constructor() {
    // بيشتغل أول مرة، وبعدين كل ما اللغة تتغير: يعيد جلب الداتا بالـ header الجديد
    effect(() => {
      this.lang.currentLang();
      untracked(() => {
        this.loadEmployees();
        this.loadWorkspaces();
      });
    });

    // أعد فحص تأكيد كلمة المرور لما كلمة المرور تتغير
    this.employeeForm.get('password')!.valueChanges.subscribe(() =>
      this.employeeForm.get('confirmPassword')!.updateValueAndValidity()
    );
  }

  // ---------- Loading ----------
  loadEmployees(): void {
    this.loadSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.loadSub = this.employeeService.getEmployees().subscribe({
      next: data => {
        this.employees.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error fetching employees:', err);
        this.errorMessage.set(this.lang.t('EMPLOYEES.ERRORS.LOAD'));
        this.isLoading.set(false);
      }
    });
  }

  loadWorkspaces(): void {
    this.workspacesSub?.unsubscribe();

    this.workspacesSub = this.workspaceService.getWorkspaces().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.items)
              ? res.data.items
              : Array.isArray(res?.items)
                ? res.items
                : [];
        this.workspaces.set(raw.map((w: any) => ({ ...w, id: Number(w.id) })));
      },
      error: err => console.error('Error fetching workspaces:', err)
    });
  }

  private refreshSilently(): void {
    this.employeeService.getEmployees().subscribe({
      next: data => this.employees.set(data),
      error: err => console.error('Silent refresh failed:', err)
    });
  }

  // ---------- Quick filter ----------
  onFilterStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  // ---------- Modal ----------
  private setPasswordValidation(enabled: boolean): void {
    const password = this.employeeForm.get('password')!;
    const confirm = this.employeeForm.get('confirmPassword')!;
   if (enabled) {
  password.setValidators(PASSWORD_VALIDATORS);
  confirm.setValidators([Validators.required, matchPassword]);
}else {
      password.clearValidators();
      confirm.clearValidators();
    }
    password.updateValueAndValidity();
    confirm.updateValueAndValidity();
  }
private setGenderValidation(required: boolean): void {
  const gender = this.employeeForm.get('gender')!;
  gender.setValidators(required ? [Validators.required] : []);
  gender.updateValueAndValidity();
}
  /** بيحوّل أي صيغة جاية من الـ API (Male / male / ذكر ...) للقيمة اللي الـ select فاهمها */
  private normalizeGender(g: unknown): Gender | null {
    if (g === null || g === undefined || g === '') return null;
    const s = String(g).trim().toLowerCase();
    if (['male', 'm', 'ذكر'].includes(s)) return 'Male';
    if (['female', 'f', 'أنثى', 'انثى'].includes(s)) return 'Female';
    return null;
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedEmployeeId.set(null);
    this.formError.set(null);
    this.employeeForm.reset();
    this.setPasswordValidation(true);
    this.setGenderValidation(true);
    this.isModalOpen.set(true);
  }

  openEditModal(emp: Employee): void {
    this.isEditMode.set(true);
    this.selectedEmployeeId.set(emp.id);
    this.formError.set(null);
    this.employeeForm.reset({
      email: emp.email ?? '',
      phoneNumber: emp.mobileNumber ?? '',
      gender: this.normalizeGender((emp as any).gender)
    });
    this.setPasswordValidation(false);
    this.isModalOpen.set(true);
this.setGenderValidation(false);
    // الـ list بترجع الاسم مترجم بس، فبنجيب التفاصيل الكاملة (Ar + En) من الـ API
    this.isFormLoading.set(true);
    this.employeeService.getEmployeeById(emp.id).subscribe({
      next: full => {
        this.employeeForm.patchValue({
          firstNameAr: full.firstNameAr ?? '',
          lastNameAr: full.lastNameAr ?? '',
          firstNameEn: full.firstNameEn ?? '',
          lastNameEn: full.lastNameEn ?? '',
          gender:
            this.normalizeGender(full.gender) ??
            this.normalizeGender((emp as any).gender),
          email: full.email ?? emp.email ?? '',
          phoneNumber: full.mobileNumber ?? emp.mobileNumber ?? ''
        });
        this.isFormLoading.set(false);
      },
      error: err => {
        console.error('Error fetching employee details:', err);
        this.formError.set(this.lang.t('EMPLOYEES.ERRORS.LOAD_DETAILS'));
        this.isFormLoading.set(false);
      }
    });
  }

  /** بيتنادى من زرار الإلغاء وزرار X، وبعد الحفظ الناجح بس */
  closeModal(): void {
    if (this.isSubmitting() || !this.isModalOpen()) return;
    this.isModalOpen.set(false);
    this.formError.set(null);
    this.employeeForm.reset();
  }

  // ---------- Form helpers ----------
  showError(name: string): boolean {
    const c = this.employeeForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

errorOf(name: string): string {
  const c: AbstractControl | null = this.employeeForm.get(name);
  if (!c?.errors) return '';
  const t = (k: string) => this.lang.t('EMPLOYEES.VALIDATION.' + k);

  if (c.errors['required']) return t('REQUIRED');
  if (c.errors['email']) return t('EMAIL');

  if (c.errors['minlength']) {
    const count = String(c.errors['minlength'].requiredLength);
    const key = name === 'password' ? 'PASSWORD_MIN_LENGTH' : 'MIN_LENGTH';
    // يدعم {count} و {{count}}
    return t(key).replace(/\{\{?\s*\w+\s*\}?\}/g, count);
  }
  if (c.errors['uppercase']) return t('PASSWORD_UPPERCASE');
  if (c.errors['lowercase']) return t('PASSWORD_LOWERCASE');
  if (c.errors['mismatch']) return t('PASSWORD_MISMATCH');

  if (c.errors['pattern']) {
    if (name === 'phoneNumber') return t('PHONE');
    if (name.endsWith('Ar')) return t('ARABIC_ONLY');
    if (name.endsWith('En')) return t('ENGLISH_ONLY');
  }
  return t('INVALID');
}

  saveEmployee(): void {
    if (this.employeeForm.invalid || this.isFormLoading()) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.employeeForm.value;
    const editingId = this.isEditMode() ? this.selectedEmployeeId() : null;

    const common = {
      firstNameAr: v.firstNameAr.trim(),
      lastNameAr: v.lastNameAr.trim(),
      firstNameEn: v.firstNameEn.trim(),
      lastNameEn: v.lastNameEn.trim(),
      email: v.email.trim(),
      phoneNumber: v.phoneNumber.trim(),
      gender: v.gender as Gender
    };

    const request$: Observable<any> =
      editingId !== null
        ? this.employeeService.updateEmployee(editingId, common)
        : this.employeeService.createEmployee({
            ...common,
            password: v.password,
            confirmPassword: v.confirmPassword
          });

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.toastr.success(
          this.lang.t(editingId !== null ? 'EMPLOYEES.TOAST.UPDATED' : 'EMPLOYEES.TOAST.CREATED')
        );
        this.refreshSilently();
      },
      error: err => {
        console.error('Error saving employee:', err);
        this.isSubmitting.set(false);
        this.formError.set(this.extractError(err, this.lang.t('EMPLOYEES.ERRORS.SAVE')));
      }
    });
  }

  // ---------- Row actions ----------
  onStatusChange(emp: Employee, event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    const newStatus = selectEl.value as EmployeeStatus;
    if (newStatus === emp.status) return;

    this.setBusy(emp.id, true);
    this.employeeService.changeStatus(emp.id, newStatus).subscribe({
      next: () => {
        this.employees.update(list =>
          list.map(e => (e.id === emp.id ? { ...e, status: newStatus } : e))
        );
        this.setBusy(emp.id, false);
        this.toastr.success(this.lang.t('EMPLOYEES.TOAST.STATUS_CHANGED'));
      },
      error: err => {
        selectEl.value = emp.status;
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, this.lang.t('EMPLOYEES.ERRORS.STATUS')));
      }
    });
  }

  onWorkspaceChange(emp: Employee, event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    const newWsId = Number(selectEl.value);
    if (!newWsId || newWsId === emp.assignedWorkspaceId) return;

    this.setBusy(emp.id, true);
    this.employeeService.assignToWorkspace(emp.id, newWsId).subscribe({
      next: () => {
        const ws = this.workspaces().find(w => w.id === newWsId);
        this.employees.update(list =>
          list.map(e =>
            e.id === emp.id
              ? { ...e, assignedWorkspaceId: newWsId, assignedWorkspaceName: ws?.name ?? null }
              : e
          )
        );
        this.setBusy(emp.id, false);
        this.toastr.success(this.lang.t('EMPLOYEES.TOAST.WORKSPACE_CHANGED'));
      },
      error: err => {
        selectEl.value = emp.assignedWorkspaceId != null ? String(emp.assignedWorkspaceId) : '';
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, this.lang.t('EMPLOYEES.ERRORS.WORKSPACE')));
      }
    });
  }

  // ---------- الحذف (مع تأكيد) ----------
  askDelete(emp: Employee): void {
    this.pendingDelete.set(emp);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const emp = this.pendingDelete();
    if (!emp) return;

    this.isDeleting.set(true);
    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        this.toastr.success(this.lang.t('EMPLOYEES.TOAST.DELETED'));
        this.refreshSilently();
      },
      error: err => {
        this.isDeleting.set(false);
        this.toastr.error(this.extractError(err, this.lang.t('EMPLOYEES.ERRORS.DELETE')));
      }
    });
  }

  onRestore(emp: Employee): void {
    this.setBusy(emp.id, true);
    this.employeeService.restoreEmployee(emp.id).subscribe({
      next: () => {
        this.setBusy(emp.id, false);
        this.toastr.success(this.lang.t('EMPLOYEES.TOAST.RESTORED'));
        this.refreshSilently();
      },
      error: err => {
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, this.lang.t('EMPLOYEES.ERRORS.RESTORE')));
      }
    });
  }

  isRemoved(emp: Employee): boolean {
    return emp.status === 'Terminated' || !!emp.isDeleted;
  }

  isBusy(id: number): boolean {
    return this.busyEmployeeIds().has(id);
  }

  private setBusy(id: number, busy: boolean): void {
    const next = new Set(this.busyEmployeeIds());
    busy ? next.add(id) : next.delete(id);
    this.busyEmployeeIds.set(next);
  }

  // ---------- Helpers ----------
  private extractError(err: any, fallback: string): string {
    const e = err?.error;
    if (typeof e === 'string' && e.trim()) return e;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors).flat() as any[])[0];
      if (typeof first === 'string') return first;
      if (first?.description) return first.description;
    }
    return fallback;
  }
}