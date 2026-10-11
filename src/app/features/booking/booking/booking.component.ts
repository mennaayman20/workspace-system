import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ToastrService } from 'ngx-toastr';
import { Popover, PopoverModule } from 'primeng/popover';
import {
  LucideAngularModule, CalendarDays, Plus, Search, Clock, Users, Building2, StickyNote,
  EllipsisVertical, ChevronRight, ChevronLeft, Pencil, Trash2, Check,
} from 'lucide-angular';

import { BookingService } from './booking.service';
import { Booking, BookingStatus, CreateBookingDto, LookupItem } from './Ibooking';
import { CustomerService } from '../../customers/customer.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { unwrapList } from '../../../core/utils/unwrap-list';
import { BookingFormModalComponent } from './booking-form-modal/booking-form-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type StatusFilter = 'all' | BookingStatus;

/** أول يوم في الأسبوع: 6 = السبت، 0 = الأحد، 1 = الاثنين */
const WEEK_STARTS_ON = 6;

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (key: string): Date => {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfWeek = (d: Date): Date => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() - WEEK_STARTS_ON + 7) % 7));
  return x;
};

const STATUS_INFO: Record<BookingStatus, { label: string; dot: string; border: string; badge: string }> = {
  Pending:   { label: 'قيد الانتظار', dot: 'bg-amber-500',   border: 'border-s-amber-400',   badge: 'bg-amber-100 text-amber-700' },
  Confirmed: { label: 'مؤكد',         dot: 'bg-blue-500',    border: 'border-s-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  Completed: { label: 'مكتمل',        dot: 'bg-emerald-500', border: 'border-s-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  Cancelled: { label: 'ملغي',         dot: 'bg-rose-500',    border: 'border-s-rose-400',    badge: 'bg-rose-100 text-rose-700' },
};
const STATUS_ORDER: BookingStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

export interface WeekDay {
  key: string;            // yyyy-MM-dd
  weekday: string;        // السبت
  day: string;            // ١٠
  month: string;          // أكتوبر
  isToday: boolean;
  isPast: boolean;
  items: Booking[];
  /** يمنع السحب لأيام فاتت */
  enterPredicate: () => boolean;
}


// أضيفي الكونستانت ده أو الـ Array الجديدة فوق الكومبوننت أو جوه الكلاس
export const BOOKING_STAT_CARDS = [
  { value: 'all', label: 'كل الحجوزات', border: 'border-s-blue-600', tint: 'from-blue-50/50', ring: 'ring-blue-600', chip: 'bg-blue-600 text-white', icon: CalendarDays },
  { value: 'Pending', label: 'قيد الانتظار', border: 'border-s-amber-400', tint: 'from-amber-50/50', ring: 'ring-amber-500', chip: 'bg-amber-100 text-amber-700', icon: Clock },
  { value: 'Confirmed', label: 'مؤكد', border: 'border-s-blue-500', tint: 'from-blue-50/50', ring: 'ring-blue-500', chip: 'bg-blue-100 text-blue-700', icon: Check },
  { value: 'Completed', label: 'مكتمل', border: 'border-s-emerald-500', tint: 'from-emerald-50/50', ring: 'ring-emerald-500', chip: 'bg-emerald-100 text-emerald-700', icon: Check },
  { value: 'Cancelled', label: 'ملغي', border: 'border-s-rose-400', tint: 'from-rose-50/50', ring: 'ring-rose-500', chip: 'bg-rose-100 text-rose-700', icon: Trash2 }, // أو أيقونة X لو حابة
];

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    LucideAngularModule, DragDropModule, PopoverModule,
    BookingFormModalComponent, ConfirmDialogComponent,
  ],
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit {
  private bookingService = inject(BookingService);
  private customerService = inject(CustomerService);
  private workspaceService = inject(WorkspaceService);
  private toastr = inject(ToastrService);

  private readonly menuPopover = viewChild<Popover>('menuPop');
readonly statCards = BOOKING_STAT_CARDS;
  // Icons
  readonly CalendarIcon = CalendarDays;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly ClockIcon = Clock;
  readonly PeopleIcon = Users;
  readonly BuildingIcon = Building2;
  readonly NoteIcon = StickyNote;
  readonly MoreIcon = EllipsisVertical;
  readonly PrevIcon = ChevronRight;   // RTL: السابق على اليمين
  readonly NextIcon = ChevronLeft;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly CheckIcon = Check;

  readonly statusOptions = STATUS_ORDER.map(value => ({
    value,
    label: STATUS_INFO[value].label,
    dot: STATUS_INFO[value].dot,
  }));

  // ---------- State ----------
  bookings = signal<Booking[]>([]);
  customers = signal<LookupItem[]>([]);
  workspaces = signal<LookupItem[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  busyIds = signal<Set<number>>(new Set());

  weekStart = signal<Date>(startOfWeek(new Date()));
  searchTerm = signal('');
  statusFilter = signal<StatusFilter>('all');

  // Form modal
  isModalOpen = signal(false);
  editingBooking = signal<Booking | null>(null);
  modalDefaultDate = signal<string | null>(null);

  // Row menu (⋮)
  activeBooking = signal<Booking | null>(null);

  // Delete confirmation
  pendingDelete = signal<Booking | null>(null);
  isDeleting = signal(false);

  // ---------- Derived ----------
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

  /** حجوزات الأسبوع المعروض (لعدّادات الحالات) */
  weekBookings = computed(() => {
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const from = dateKey(start);
    const to = dateKey(end);
    return this.bookings().filter(b => {
      const k = this.keyOf(b);
      return k >= from && k <= to;
    });
  });

  statusCounts = computed(() => {
    const counts: Record<string, number> = { all: this.weekBookings().length };
    for (const s of STATUS_ORDER) counts[s] = 0;
    for (const b of this.weekBookings()) {
      if (counts[b.status] !== undefined) counts[b.status]++;
    }
    return counts;
  });

  isCurrentWeek = computed(() => dateKey(this.weekStart()) === dateKey(startOfWeek(new Date())));

  weekLabel = computed(() => {
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const a = start.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
    const b = end.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${a} – ${b}`;
  });

  weekDays = computed<WeekDay[]>(() => {
    const start = this.weekStart();
    const todayKey = dateKey(new Date());

    const byDay = new Map<string, Booking[]>();
    for (const b of this.filteredBookings()) {
      const k = this.keyOf(b);
      const arr = byDay.get(k);
      if (arr) arr.push(b);
      else byDay.set(k, [b]);
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = dateKey(date);
      const isPast = key < todayKey;

      const items = (byDay.get(key) ?? [])
        .slice()
        .sort((a, b) => this.minutes(a.startTime) - this.minutes(b.startTime));

      return {
        key,
        weekday: date.toLocaleDateString('ar-EG', { weekday: 'long' }),
        day: date.toLocaleDateString('ar-EG', { day: 'numeric' }),
        month: date.toLocaleDateString('ar-EG', { month: 'long' }),
        isToday: key === todayKey,
        isPast,
        items,
        enterPredicate: () => !isPast,
      };
    });
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
        this.scrollToToday();
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل الحجوزات. حاولي مرة أخرى.');
        this.isLoading.set(false);
      }
    });
  }

  private refreshSilently(): void {
    this.bookingService.getBookings().subscribe({
      next: data => this.bookings.set(data),
      error: () => this.toastr.warning('تعذر تحديث القائمة، حدّثي الصفحة')
    });
  }

  private loadLookups(): void {
    this.customerService.getCustomers(1, 100).subscribe({
      next: (res: any) =>
        this.customers.set(
          unwrapList(res).map((c: any) => ({
            id: Number(c.id),
            name: c.fullName || c.mobileNumber || `#${c.id}`
          }))
        ),
      error: () => this.toastr.error('تعذر تحميل قائمة العملاء')
    });

    this.workspaceService.getWorkspaces().subscribe({
      next: (res: any) =>
        this.workspaces.set(
          unwrapList(res).map((w: any) => ({ id: Number(w.id), name: w.name }))
        ),
      error: () => this.toastr.error('تعذر تحميل قائمة المساحات')
    });
  }

  // ---------- Week navigation ----------
  shiftWeek(delta: number): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + delta * 7);
    this.weekStart.set(d);
  }

  goToToday(): void {
    this.weekStart.set(startOfWeek(new Date()));
    this.scrollToToday();
  }

  private scrollToToday(): void {
    setTimeout(() => {
      document
        .getElementById('booking-day-today')
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 80);
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

  // ---------- Form modal ----------
  openForm(booking: Booking | null = null, date: string | null = null): void {
    this.editingBooking.set(booking);
    this.modalDefaultDate.set(date);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingBooking.set(null);
    this.modalDefaultDate.set(null);
  }

  /** بعد الحفظ: نروح لأسبوع الحجز عشان يتشاف */
  onSaved(savedDateKey: string): void {
    this.closeModal();
    if (savedDateKey) this.weekStart.set(startOfWeek(parseKey(savedDateKey)));
    this.refreshSilently();
  }

  // ---------- Drag & drop ----------
  canDrag(b: Booking): boolean {
    return b.status === 'Pending' || b.status === 'Confirmed';
  }

  onDrop(event: CdkDragDrop<WeekDay, WeekDay, Booking>): void {
    const target = event.container.data;
    const from = event.previousContainer.data;
    const booking = event.item.data;
    if (!target || !booking || target.key === from.key) return;

    this.reschedule(booking, target);
  }

  private reschedule(b: Booking, target: WeekDay): void {
    const dto = this.toDto(b, target.key);
    const snapshot = this.bookings();

    this.setBusy(b.id, true);
    this.patchBooking(b.id, {
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      expectedEndTime: dto.expectedEndTime,
    });

    this.bookingService.updateBooking(b.id, dto).subscribe({
      next: () => {
        this.setBusy(b.id, false);
        this.toastr.success(`تم نقل الحجز إلى ${target.weekday} ${target.day} ${target.month}`);
      },
      error: err => {
        this.bookings.set(snapshot); // رجوع للحالة القديمة
        this.setBusy(b.id, false);
        this.toastr.error(this.extractError(err, 'تعذر نقل الحجز.'));
      }
    });
  }

  /** نفس الساعات، بس في يوم جديد */
  private toDto(b: Booking, key: string): CreateBookingDto {
    const hhmm = (v: string) => {
      const d = new Date(v);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return {
      customerId: b.customerId,
      workspaceId: b.workspaceId,
      bookingDate: `${key}T00:00:00`,
      startTime: `${key}T${hhmm(b.startTime)}:00`,
      expectedEndTime: b.expectedEndTime ? `${key}T${hhmm(b.expectedEndTime)}:00` : null,
      numberOfPeople: b.numberOfPeople,
      notes: b.notes,
    };
  }

  // ---------- Row menu (⋮) ----------
  openMenu(event: Event, b: Booking): void {
    event.stopPropagation();
    this.activeBooking.set(b);
    this.menuPopover()?.toggle(event, event.currentTarget);
  }

  onMenuEdit(): void {
    const b = this.activeBooking();
    this.menuPopover()?.hide();
    if (b) this.openForm(b);
  }

  onMenuStatus(status: BookingStatus): void {
    const b = this.activeBooking();
    this.menuPopover()?.hide();
    if (b) this.changeStatus(b, status);
  }

  onMenuDelete(): void {
    const b = this.activeBooking();
    this.menuPopover()?.hide();
    if (b) this.askDelete(b);
  }

  // ---------- Status ----------
  changeStatus(b: Booking, status: BookingStatus): void {
    if (status === b.status || this.isBusy(b.id)) return;

    const previous = b.status;
    this.setBusy(b.id, true);
    this.patchBooking(b.id, { status }); // optimistic

    this.bookingService.changeStatus(b.id, status).subscribe({
      next: () => {
        this.setBusy(b.id, false);
        this.toastr.success('تم تغيير حالة الحجز');
      },
      error: err => {
        this.patchBooking(b.id, { status: previous });
        this.setBusy(b.id, false);
        this.toastr.error(this.extractError(err, 'تعذر تغيير الحالة.'));
      }
    });
  }

  // ---------- Delete ----------
  askDelete(b: Booking): void {
    this.pendingDelete.set(b);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const b = this.pendingDelete();
    if (!b) return;

    this.isDeleting.set(true);
    this.setBusy(b.id, true);

    this.bookingService.deleteBooking(b.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.setBusy(b.id, false);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف الحجز');
        this.refreshSilently();
      },
      error: err => {
        this.isDeleting.set(false);
        this.setBusy(b.id, false);
        this.toastr.error(this.extractError(err, 'تعذر حذف الحجز.'));
      }
    });
  }

  // ---------- Helpers ----------
  isBusy(id: number): boolean {
    return this.busyIds().has(id);
  }

  private setBusy(id: number, busy: boolean): void {
    this.busyIds.update(set => {
      const next = new Set(set);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }

  private patchBooking(id: number, patch: Partial<Booking>): void {
    this.bookings.update(list => list.map(x => (x.id === id ? { ...x, ...patch } : x)));
  }

  /** يوم الحجز (yyyy-MM-dd) من bookingDate نفسه من غير تحويل timezone */
  private keyOf(b: Booking): string {
    return (b.bookingDate ?? '').slice(0, 10);
  }

  private minutes(value: string): number {
    const d = new Date(value);
    return isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes();
  }

  formatTime(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  statusInfo(status: string) {
    return STATUS_INFO[status as BookingStatus] ?? STATUS_INFO.Pending;
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