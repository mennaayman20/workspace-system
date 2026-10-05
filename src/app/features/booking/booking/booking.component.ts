import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  CalendarDays,
  Plus,
  Search,
  Edit3,
  Trash2,
  Clock,
  Users,
  Building2,
  StickyNote
} from 'lucide-angular';
import { BookingService } from './booking.service';
import { Booking, BookingStatus, LookupItem } from './Ibooking';
import { CustomerService } from '../../customers/customer.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { unwrapList } from '../../../core/utils/unwrap-list';
import { BookingFormModalComponent } from './booking-form-modal/booking-form-modal.component';
type StatusFilter = 'all' | BookingStatus;

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,

BookingFormModalComponent,
    MatSnackBarModule,
    MatTooltipModule,
    
  ],
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit {
  private bookingService = inject(BookingService);
  private customerService = inject(CustomerService);
  private workspaceService = inject(WorkspaceService);

  private snack = inject(MatSnackBar);

  // Icons
  readonly CalendarIcon = CalendarDays;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly EditIcon = Edit3;
  readonly TrashIcon = Trash2;
  readonly ClockIcon = Clock;
  readonly PeopleIcon = Users;
  readonly BuildingIcon = Building2;
  readonly NoteIcon = StickyNote;

  // State
  bookings = signal<Booking[]>([]);
  customers = signal<LookupItem[]>([]);
  workspaces = signal<LookupItem[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  busyIds = signal<Set<number>>(new Set());
isModalOpen = signal(false);
editingBooking = signal<Booking | null>(null);
  searchTerm = signal('');
  statusFilter = signal<StatusFilter>('all');

  readonly statusOptions: { value: BookingStatus; label: string }[] = [
    { value: 'Pending', label: 'قيد الانتظار' },
    { value: 'Confirmed', label: 'مؤكد' },
    { value: 'Completed', label: 'مكتمل' },
    { value: 'Cancelled', label: 'ملغي' }
  ];

  filteredBookings = computed(() => {
    let list = this.bookings();
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();

    if (status !== 'all') list = list.filter(b => b.status === status);
    if (term) {
      list = list.filter(
        b =>
          b.customerName?.toLowerCase().includes(term) ||
          b.workspaceName?.toLowerCase().includes(term)
      );
    }
    return list;
  });

  statusCounts = computed(() => {
    const counts: Record<string, number> = {
      all: this.bookings().length,
      Pending: 0,
      Confirmed: 0,
      Completed: 0,
      Cancelled: 0
    };
    for (const b of this.bookings()) {
      if (counts[b.status] !== undefined) counts[b.status]++;
    }
    return counts;
  });

  ngOnInit(): void {
    this.loadBookings();
    this.loadLookups();
  }

  // ---------- Loading ----------
  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.bookingService.getBookings().subscribe({
      next: data => {
        this.bookings.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل الحجوزات. حاولي مرة أخرى.');
        this.isLoading.set(false);
      }
    });
  }

  private refreshSilently(): void {
    this.bookingService.getBookings().subscribe({
      next: data => this.bookings.set(data)
    });
  }

  private loadLookups(): void {
    this.customerService.getCustomers().subscribe({
      next: (res: any) =>
        this.customers.set(
          unwrapList(res).map((c: any) => ({ id: Number(c.id), name: c.fullName }))
        )
    });
    this.workspaceService.getWorkspaces().subscribe({
      next: (res: any) =>
        this.workspaces.set(
          unwrapList(res).map((w: any) => ({ id: Number(w.id), name: w.name }))
        )
    });
  }

  // ---------- Filters ----------
  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  onFilterStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }

openForm(booking: Booking | null = null): void {
  this.editingBooking.set(booking);
  this.isModalOpen.set(true);
}

closeModal(): void {
  this.isModalOpen.set(false);
  this.editingBooking.set(null);
}

onSaved(): void {
  const wasEdit = !!this.editingBooking();
  this.closeModal();
  this.notify(wasEdit ? 'تم تعديل الحجز' : 'تمت إضافة الحجز بنجاح');
  this.refreshSilently();
}

  // ---------- Row actions ----------
  onStatusChange(b: Booking, event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    const newStatus = selectEl.value as BookingStatus;
    if (newStatus === b.status) return;

    this.setBusy(b.id, true);
    this.bookingService.changeStatus(b.id, newStatus).subscribe({
      next: () => {
        this.bookings.update(list =>
          list.map(x => (x.id === b.id ? { ...x, status: newStatus } : x))
        );
        this.setBusy(b.id, false);
        this.notify('تم تغيير حالة الحجز');
      },
      error: err => {
        selectEl.value = b.status;
        this.setBusy(b.id, false);
        this.notify(this.extractError(err, 'تعذر تغيير الحالة.'), true);
      }
    });
  }

  onDelete(b: Booking): void {
    if (!confirm(`هل أنت متأكدة من حذف حجز "${b.customerName}"؟`)) return;

    this.setBusy(b.id, true);
    this.bookingService.deleteBooking(b.id).subscribe({
      next: () => {
        this.setBusy(b.id, false);
        this.notify('تم حذف الحجز');
        this.refreshSilently();
      },
      error: err => {
        this.setBusy(b.id, false);
        this.notify(this.extractError(err, 'تعذر حذف الحجز.'), true);
      }
    });
  }

  isBusy(id: number): boolean {
    return this.busyIds().has(id);
  }

  private setBusy(id: number, busy: boolean): void {
    const next = new Set(this.busyIds());
    busy ? next.add(id) : next.delete(id);
    this.busyIds.set(next);
  }

  // ---------- UI helpers ----------
  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(value: string | null): string {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  statusLabel(status: string): string {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      default:
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    }
  }

  statusAccentClass(status: string): string {
    switch (status) {
      case 'Confirmed':
        return 'from-blue-500 to-indigo-500';
      case 'Completed':
        return 'from-emerald-500 to-teal-500';
      case 'Cancelled':
        return 'from-rose-500 to-pink-500';
      default:
        return 'from-amber-400 to-orange-500';
    }
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-500';
      case 'Completed':
        return 'bg-emerald-500';
      case 'Cancelled':
        return 'bg-rose-500';
      case 'Pending':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  }

  private notify(message: string, isError = false): void {
    this.snack.open(message, 'إغلاق', {
      duration: isError ? 5000 : 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      direction: 'rtl'
    });
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