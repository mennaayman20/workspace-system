import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { LucideAngularModule, CalendarPlus, Clock, ChevronDown, Minus, Plus, X } from 'lucide-angular';
import { BookingService } from '../booking.service';
import { Booking, CreateBookingDto, LookupItem } from '../Ibooking';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'HH:mm' -> دقائق من بداية اليوم */
const toMin = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toHHmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = toMin(group.get('startTime')?.value);
  const end = toMin(group.get('expectedEndTime')?.value);
  return start !== null && end !== null && end <= start ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-booking-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './booking-form-modal.component.html'
})
export class BookingFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bookingService = inject(BookingService);

  @Input() booking: Booking | null = null;
  @Input() customers: LookupItem[] = [];
  @Input() workspaces: LookupItem[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Icons
  readonly CalendarPlusIcon = CalendarPlus;
  readonly ClockIcon = Clock;
  readonly ChevronIcon = ChevronDown;
  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;
  readonly CloseIcon = X;

  isSubmitting = signal(false);
  formError = signal<string | null>(null);
  today = this.toDateInput(new Date());

  readonly startSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '16:00'];
  readonly durations = [
    { hours: 1, label: 'ساعة' },
    { hours: 2, label: 'ساعتين' },
    { hours: 3, label: '3 ساعات' },
    { hours: 4, label: '4 ساعات' }
  ];

  form = this.fb.group(
    {
      customerId: [null as number | null, Validators.required],
      workspaceId: [null as number | null, Validators.required],
      bookingDate: ['', Validators.required],
      startTime: ['', Validators.required],
      expectedEndTime: [''],
      numberOfPeople: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    },
    { validators: endAfterStart }
  );

  get isEdit(): boolean {
    return !!this.booking;
  }

  ngOnInit(): void {
    const b = this.booking;
    if (!b) return;

    const timeOf = (v?: string | null) => {
      if (!v) return '';
      const d = new Date(v);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    this.form.patchValue({
      customerId: b.customerId,
      workspaceId: b.workspaceId,
      bookingDate: this.toDateInput(new Date(b.bookingDate)),
      startTime: timeOf(b.startTime),
      expectedEndTime: timeOf(b.expectedEndTime),
      numberOfPeople: b.numberOfPeople,
      notes: b.notes ?? ''
    });
  }

  // ---------- Modal ----------
  @HostListener('document:keydown.escape')
  close(): void {
    if (this.isSubmitting()) return;
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  // ---------- Form helpers ----------
  showError(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(name: string): string {
    const c = this.form.get(name);
    if (c?.errors?.['required']) return 'هذا الحقل مطلوب';
    if (c?.errors?.['min']) return 'لازم يكون 1 على الأقل';
    return 'قيمة غير صالحة';
  }

  // ---------- Quick date ----------
  setDateOffset(days: number): void {
    const d = new Date();
    d.setDate(d.getDate() + days);
    this.form.patchValue({ bookingDate: this.toDateInput(d) });
    this.form.controls.bookingDate.markAsDirty();
  }

  isDateOffset(days: number): boolean {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return this.form.value.bookingDate === this.toDateInput(d);
  }

  // ---------- Quick start ----------
  setStart(time: string): void {
    this.form.patchValue({ startTime: time });
    this.form.controls.startTime.markAsDirty();
  }

  // ---------- Quick duration ----------
  setDuration(hours: number): void {
    const start = toMin(this.form.value.startTime);
    if (start === null || this.isDurationDisabled(hours)) return;
    this.form.patchValue({ expectedEndTime: toHHmm(start + hours * 60) });
    this.form.controls.expectedEndTime.markAsDirty();
  }

  /** الشريحة تتعطل لو مفيش بداية أو النهاية هتعدي منتصف الليل */
  isDurationDisabled(hours: number): boolean {
    const start = toMin(this.form.value.startTime);
    return start === null || start + hours * 60 > 23 * 60 + 59;
  }

  isDuration(hours: number): boolean {
    return this.durationMinutes() === hours * 60;
  }

  durationMinutes(): number | null {
    const start = toMin(this.form.value.startTime);
    const end = toMin(this.form.value.expectedEndTime);
    return start !== null && end !== null && end > start ? end - start : null;
  }

  // ---------- People stepper ----------
  changePeople(delta: number): void {
    const current = Number(this.form.value.numberOfPeople) || 1;
    this.form.patchValue({ numberOfPeople: Math.max(1, current + delta) });
    this.form.controls.numberOfPeople.markAsDirty();
  }

  // ---------- Display ----------
  fmt12(time: string): string {
    const d = new Date();
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  summary(): string {
    const { bookingDate, startTime, expectedEndTime } = this.form.value;
    if (!bookingDate || !startTime) return '';

    const day = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    let text = `${day} · ${this.fmt12(startTime)}`;

    const mins = this.durationMinutes();
    if (expectedEndTime && mins) {
      text += ` ← ${this.fmt12(expectedEndTime)} (${this.durationLabel(mins)})`;
    }
    return text;
  }

  private durationLabel(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hours = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h >= 3 && h <= 10 ? `${h} ساعات` : `${h} ساعة`;
    if (m === 0) return hours;
    return h === 0 ? `${m} دقيقة` : `${hours} و${m} دقيقة`;
  }

  // ---------- Save ----------
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const dto: CreateBookingDto = {
      customerId: Number(v.customerId),
      workspaceId: Number(v.workspaceId),
      bookingDate: `${v.bookingDate}T00:00:00`,
      startTime: `${v.bookingDate}T${v.startTime}:00`,
      expectedEndTime: v.expectedEndTime ? `${v.bookingDate}T${v.expectedEndTime}:00` : null,
      numberOfPeople: Number(v.numberOfPeople),
      notes: v.notes?.trim() || null
    };

    this.isSubmitting.set(true);
    this.formError.set(null);

    const request$ = this.booking
      ? this.bookingService.updateBooking(this.booking.id, dto)
      : this.bookingService.createBooking(dto);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.saved.emit();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.formError.set(this.extractError(err));
      }
    });
  }

  // ---------- Utils ----------
  private toDateInput(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private extractError(err: any): string {
    const e = err?.error;
    if (typeof e === 'string' && e.trim()) return e;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors).flat() as any[])[0];
      if (typeof first === 'string') return first;
      if (first?.description) return first.description;
    }
    return 'تعذر حفظ الحجز، حاولي مرة أخرى.';
  }
}