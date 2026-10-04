import {
  Component,
  HostListener,
  OnDestroy,
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
  LucideAngularModule,
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  RotateCcw
} from 'lucide-angular';
import { Observable, switchMap, of, catchError } from 'rxjs';
import { EmployeeService } from './employee.service';
import { WorkspaceService } from '../../core/services/workspace.service'; // تأكدي من مسار الـ WorkspaceService لديك
import {
  CreateEmployeeDto,
  Employee,
  EmployeeStatus,
  UpdateEmployeeDto
} from './Iimployee';

type StatusFilter = 'all' | EmployeeStatus;
interface Toast {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.scss']
})
export class EmployeeComponent implements OnInit, OnDestroy {
  private employeeService = inject(EmployeeService);
  private workspaceService = inject(WorkspaceService);
  private fb = inject(FormBuilder);

  // Icons
  readonly UsersIcon = Users;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly EditIcon = Edit3;
  readonly TrashIcon = Trash2;
  readonly RotateCcwIcon = RotateCcw;

  // Data state
  employees = signal<Employee[]>([]);
  workspaces = signal<{ id: number; name: string }[]>([]); // قائمة المساحات
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  busyEmployeeIds = signal<Set<number>>(new Set());

  // Modal state
  isModalOpen = signal(false);
  isEditMode = signal(false);
  selectedEmployeeId = signal<number | null>(null);
  formError = signal<string | null>(null);

  // Toast
  toast = signal<Toast | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Search / filter / pagination
  searchTerm = signal('');
  statusFilter = signal<StatusFilter>('all');
  page = signal(1);
  readonly pageSize = 10;

  readonly statusOptions: { value: EmployeeStatus; label: string }[] = [
    { value: 'Active', label: 'نشط' },
    { value: 'Inactive', label: 'غير نشط' },
    { value: 'Suspended', label: 'معلق' },
    { value: 'Terminated', label: 'منتهي' }
  ];

  employeeForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,15}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    workspaceId: [null, [Validators.required]] // أضيف حقل مكان العمل
  });

  // ---------- Computed ----------
  filteredEmployees = computed(() => {
    let list = this.employees();
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    if (status !== 'all') {
      list = list.filter(e => e.status === status);
    }
    if (search) {
      list = list.filter(
        e =>
          e.fullName?.toLowerCase().includes(search) ||
          e.email?.toLowerCase().includes(search) ||
          e.mobileNumber?.includes(search)
      );
    }
    return list;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize))
  );

  pagedEmployees = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredEmployees().slice(start, start + this.pageSize);
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

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
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
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.workspaces.set(list);
      },
      error: err => console.error('Error fetching workspaces:', err)
    });
  }

  private refreshSilently(): void {
    this.employeeService.getEmployees().subscribe({
      next: data => {
        this.employees.set(data);
        this.clampPage();
      },
      error: err => console.error('Silent refresh failed:', err)
    });
  }

  // ---------- Search / Filters / Paging ----------
  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
  }

  onFilterStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.page.set(1);
  }

  goToPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  private clampPage(): void {
    if (this.page() > this.totalPages()) this.page.set(this.totalPages());
  }

  // ---------- Modal ----------
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedEmployeeId.set(null);
    this.formError.set(null);
    this.employeeForm.reset();

    // نضع الـ Validators للكلمة السر والـ Workspace عند الإضافة
    this.employeeForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.employeeForm.get('workspaceId')?.setValidators([Validators.required]);
    this.employeeForm.get('password')?.updateValueAndValidity();
    this.employeeForm.get('workspaceId')?.updateValueAndValidity();

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
      password: '',
      workspaceId: emp.assignedWorkspaceId ?? null
    });

    // عند التعديل، لا نلزم كلمة السر والـ Workspace
    this.employeeForm.get('password')?.clearValidators();
    this.employeeForm.get('workspaceId')?.clearValidators();
    this.employeeForm.get('password')?.updateValueAndValidity();
    this.employeeForm.get('workspaceId')?.updateValueAndValidity();

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
    }).pipe(
      switchMap((res: any) => {
        const selectedWorkspaceId = v.workspaceId ? Number(v.workspaceId) : null;
        let newEmpId = res?.data?.id ?? res?.id ?? res?.userId;

        if (typeof newEmpId !== 'number' && !isNaN(Number(newEmpId))) {
          newEmpId = Number(newEmpId);
        }

        // إذا وجدنا ID رقمي نرسل طلب التعيين
        if (typeof newEmpId === 'number' && !isNaN(newEmpId) && selectedWorkspaceId) {
          return this.employeeService.assignToWorkspace(newEmpId, selectedWorkspaceId);
        }

        // إذا لم يعُد الـ register بـ ID، نجلب قائمة الموظفين لنبحث عن الموظف بالـ Email ونربطه
        return this.employeeService.getEmployees().pipe(
          switchMap(employees => {
            const createdEmp = employees.find(e => e.email?.toLowerCase() === common.email.toLowerCase());
            if (createdEmp?.id && selectedWorkspaceId) {
              return this.employeeService.assignToWorkspace(createdEmp.id, selectedWorkspaceId);
            }
            return of(res);
          }),
          catchError(err => {
            console.error('Error fetching/assigning workspace fallback:', err);
            return of(res); // نضمن استمرار السلسلة حتى لو فشل الربط التلقائي
          })
        );
      })
    );
  }

  request$.subscribe({
    next: () => {
      this.isSubmitting.set(false);
      this.closeModal();
      this.showToast(
        'success',
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
        this.showToast('success', 'تم تغيير الحالة');
        this.clampPage();
      },
      error: err => {
        selectEl.value = emp.status;
        this.setBusy(emp.id, false);
        this.showToast('error', this.extractError(err, 'تعذر تغيير الحالة.'));
      }
    });
  }

  onDelete(emp: Employee): void {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${emp.fullName}"؟`)) return;

    this.setBusy(emp.id, true);
    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.setBusy(emp.id, false);
        this.showToast('success', 'تم حذف الموظف');
        this.refreshSilently();
      },
      error: err => {
        this.setBusy(emp.id, false);
        this.showToast('error', this.extractError(err, 'تعذر حذف الموظف.'));
      }
    });
  }

  onRestore(emp: Employee): void {
    this.setBusy(emp.id, true);
    this.employeeService.restoreEmployee(emp.id).subscribe({
      next: () => {
        this.setBusy(emp.id, false);
        this.showToast('success', 'تمت استعادة الموظف');
        this.refreshSilently();
      },
      error: err => {
        this.setBusy(emp.id, false);
        this.showToast('error', this.extractError(err, 'تعذر استعادة الموظف.'));
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

  // ---------- UI helpers ----------
  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'Suspended':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'Terminated':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      default:
        return 'bg-slate-50 text-slate-600 ring-slate-500/20';
    }
  }

  statusLabel(status?: string): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? (status || 'غير معروف');
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500';
      case 'Inactive':
        return 'bg-slate-400';
      case 'Suspended':
        return 'bg-amber-500';
      default:
        return 'bg-rose-500';
    }
  }

  private showToast(type: Toast['type'], text: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ type, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }

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