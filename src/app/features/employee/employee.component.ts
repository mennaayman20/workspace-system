import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  LucideAngularModule, Users, Plus, Edit3, Trash2, RotateCcw, X, User, Save, Phone, Mail, Lock,
  CheckCircle2, UserX, PauseCircle, Ban
} from 'lucide-angular';
import { InputTextModule } from 'primeng/inputtext';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { EmployeeService } from './employee.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Employee, EmployeeStatus } from './Iimployee';
import { PortalDirective } from '../../shared/directives/portal.directive';
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
type StatusFilter = 'all' | EmployeeStatus;

interface StatCard {
  value: StatusFilter;
  label: string;
  icon: any;
  /** كلاسات Tailwind لازم تتكتب كاملة عشان تتلقط في الـ build */
  border: string;
  tint: string;
  chip: string;
  ring: string;
}

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
  
    DataTableComponent,
    CellTemplateDirective,
    RowActionsDirective,
    InputTextModule,
    ConfirmDialogComponent

    
  ],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.scss']
})
export class EmployeeComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private workspaceService = inject(WorkspaceService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

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
  selectedEmployeeId = signal<number | null>(null);
  formError = signal<string | null>(null);

  // Delete confirmation
  pendingDelete = signal<Employee | null>(null);
  isDeleting = signal(false);

  // Quick filter (stat cards)
  statusFilter = signal<StatusFilter>('all');

  readonly statusOptions: { value: EmployeeStatus; label: string }[] = [
    { value: 'Active', label: 'نشط' },
    { value: 'Inactive', label: 'غير نشط' },
    { value: 'Suspended', label: 'معلق' },
    { value: 'Terminated', label: 'منتهي' }
  ];

  // ---------- كروت الإحصائيات (بتشتغل كفلتر سريع) ----------
  readonly statCards: StatCard[] = [
    {
      value: 'all', label: 'إجمالي الموظفين', icon: Users,
      border: 'border-s-blue-500', tint: 'from-blue-50',
      chip: 'bg-blue-100 text-blue-600', ring: 'ring-blue-400'
    },
    {
      value: 'Active', label: 'نشط', icon: CheckCircle2,
      border: 'border-s-emerald-500', tint: 'from-emerald-50',
      chip: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-400'
    },
    {
      value: 'Inactive', label: 'غير نشط', icon: UserX,
      border: 'border-s-slate-500', tint: 'from-slate-100',
      chip: 'bg-slate-200 text-slate-600', ring: 'ring-slate-400'
    },
    {
      value: 'Suspended', label: 'معلق', icon: PauseCircle,
      border: 'border-s-amber-500', tint: 'from-amber-50',
      chip: 'bg-amber-100 text-amber-600', ring: 'ring-amber-400'
    },
    {
      value: 'Terminated', label: 'منتهي', icon: Ban,
      border: 'border-s-rose-500', tint: 'from-rose-50',
      chip: 'bg-rose-100 text-rose-600', ring: 'ring-rose-400'
    }
  ];

  // ---------- Table config ----------
  readonly columns: TableColumn<Employee>[] = [
    { key: 'fullName', header: 'الموظف', sortable: true, align: 'start' },
    { key: 'email', header: 'البريد الإلكتروني', type: 'mono', sortable: true },
    { key: 'mobileNumber', header: 'رقم الهاتف', type: 'mono' },
    {
      key: 'assignedWorkspaceName',
      header: 'مكان العمل',
      fallback: 'غير محدد',
      // لو الـ API رجّع الـ id بس، نجيب الاسم من قايمة الـ workspaces
      value: e =>
        e.assignedWorkspaceName ??
        this.workspaces().find(w => w.id === e.assignedWorkspaceId)?.name
    },
    {
      key: 'status',
      header: 'الحالة',
      type: 'badge',
      // الـ badges هي كمان مصدر اختيارات فلتر الحالة
      badges: {
        Active: { label: 'نشط', class: BADGE.green },
        Inactive: { label: 'غير نشط', class: BADGE.slate },
        Suspended: { label: 'معلق', class: BADGE.amber },
        Terminated: { label: 'منتهي', class: BADGE.red }
      }
    }
  ];

  readonly actions: TableAction<Employee>[] = [
    { key: 'edit', label: 'تعديل', icon: Edit3, tone: 'primary', disabled: e => this.isBusy(e.id) },
    {
      key: 'delete', label: 'حذف', icon: Trash2, tone: 'danger',
      visible: e => !this.isRemoved(e), disabled: e => this.isBusy(e.id)
    },
    {
      key: 'restore', label: 'استعادة', icon: RotateCcw, tone: 'success',
      visible: e => this.isRemoved(e), disabled: e => this.isBusy(e.id)
    }
  ];

  readonly rowClass = (e: Employee): string =>
    this.isBusy(e.id) ? 'opacity-50 pointer-events-none' : '';

  onAction(e: TableActionEvent<Employee>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
    if (e.key === 'restore') this.onRestore(e.row);
  }

  employeeForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,15}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // ---------- Computed ----------
  /** الجدول نفسه بيتكفل بالبحث والفلاتر والـ pagination؛ هنا بس فلتر الكروت */
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

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    this.loadEmployees();
    this.loadWorkspaces();
  }

  // ---------- Loading ----------
  loadEmployees(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.employeeService.getEmployees().subscribe({
      next: data => {
        this.employees.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error fetching employees:', err);
        this.errorMessage.set('تعذر تحميل قائمة الموظفين. يرجى التأكد من الاتصال وإعادة المحاولة.');
        this.isLoading.set(false);
      }
    });
  }

  loadWorkspaces(): void {
    this.workspaceService.getWorkspaces().subscribe({
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
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedEmployeeId.set(null);
    this.formError.set(null);
    this.employeeForm.reset();

    this.employeeForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.employeeForm.get('password')?.updateValueAndValidity();

    this.isModalOpen.set(true);
  }

  openEditModal(emp: Employee): void {
    this.isEditMode.set(true);
    this.selectedEmployeeId.set(emp.id);
    this.formError.set(null);

    const parts = (emp.fullName || '').trim().split(/\s+/);
    this.employeeForm.reset({
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      email: emp.email ?? '',
      mobileNumber: emp.mobileNumber ?? '',
      password: ''
    });

    // عند التعديل لا نلزم كلمة السر
    this.employeeForm.get('password')?.clearValidators();
    this.employeeForm.get('password')?.updateValueAndValidity();

    this.isModalOpen.set(true);
  }

  @HostListener('document:keydown.escape')
  closeModal(): void {
    if (this.isSubmitting() || !this.isModalOpen()) return;
    this.isModalOpen.set(false);
    this.formError.set(null);
    this.employeeForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  // ---------- Form helpers ----------
  showError(name: string): boolean {
    const c = this.employeeForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(name: string): string {
    const c: AbstractControl | null = this.employeeForm.get(name);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'هذا الحقل مطلوب';
    if (c.errors['email']) return 'صيغة البريد الإلكتروني غير صحيحة';
    if (c.errors['minlength'])
      return `الحد الأدنى ${c.errors['minlength'].requiredLength} أحرف`;
    if (c.errors['pattern']) return 'رقم الهاتف غير صحيح';
    return 'قيمة غير صالحة';
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.employeeForm.value;
    const editingId = this.isEditMode() ? this.selectedEmployeeId() : null;

    const common = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      phoneNumber: v.mobileNumber.trim()
    };

    let request$: Observable<any>;

    if (editingId !== null) {
      request$ = this.employeeService.updateEmployee(editingId, common);
    } else {
      request$ = this.employeeService.createEmployee({
        ...common,
        password: v.password,
        confirmPassword: v.password,
        role: 'Employee'
      });
    }

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.toastr.success(
          editingId !== null ? 'تم تعديل بيانات الموظف' : 'تمت إضافة الموظف بنجاح'
        );
        this.refreshSilently();
      },
      error: err => {
        console.error('Error saving employee:', err);
        this.isSubmitting.set(false);
        this.formError.set(this.extractError(err, 'تعذر حفظ البيانات، حاول مرة أخرى.'));
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
        this.toastr.success('تم تغيير الحالة');
      },
      error: err => {
        selectEl.value = emp.status;
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, 'تعذر تغيير الحالة.'));
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
        this.toastr.success('تم تغيير مكان العمل');
      },
      error: err => {
        selectEl.value = emp.assignedWorkspaceId != null ? String(emp.assignedWorkspaceId) : '';
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, 'تعذر تغيير مكان العمل.'));
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
        this.toastr.success('تم حذف الموظف');
        this.refreshSilently();
      },
      error: err => {
        this.isDeleting.set(false);
        this.toastr.error(this.extractError(err, 'تعذر حذف الموظف.'));
      }
    });
  }

  onRestore(emp: Employee): void {
    this.setBusy(emp.id, true);
    this.employeeService.restoreEmployee(emp.id).subscribe({
      next: () => {
        this.setBusy(emp.id, false);
        this.toastr.success('تمت استعادة الموظف');
        this.refreshSilently();
      },
      error: err => {
        this.setBusy(emp.id, false);
        this.toastr.error(this.extractError(err, 'تعذر استعادة الموظف.'));
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