import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import {
  LucideAngularModule, CalendarPlus, Clock, Minus, Plus, X, UserRound, Users, FileText,
} from 'lucide-angular';

import { BookingService } from '../booking.service';
import { LanguageService } from '../../../../core/services/lang.service'; // عدّل المسار لو مختلف
import { Booking, CreateBookingDto, LookupItem } from '../Ibooking';

// ---------- helpers ----------
const pad = (n: number) => String(n).padStart(2, '0');

const minutesOf = (d: Date | null | undefined): number | null =>
  d ? d.getHours() * 60 + d.getMinutes() : null;

/** دقائق من بداية اليوم -> Date (للـ time picker) */
const timeDate = (min: number): Date => new Date(1970, 0, 1, Math.floor(min / 60), min % 60, 0, 0);

const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseKey = (key: string): Date => {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const startOfToday = (): Date => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

// ---------- validators ----------
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = minutesOf(group.get('startTime')?.value);
  const end = minutesOf(group.get('expectedEndTime')?.value);
  return start !== null && end !== null && end <= start ? { endBeforeStart: true } : null;
}

function notPastDate(c: AbstractControl): ValidationErrors | null {
  const v = c.value as Date | null;
  return v && dateKey(v) < dateKey(startOfToday()) ? { pastDate: true } : null;
}

@Component({
  selector: 'app-booking-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule, LucideAngularModule, TranslatePipe,
    SelectModule, DatePickerModule, InputNumberModule, TextareaModule,
  ],
  templateUrl: './booking-form-modal.component.html'
})
export class BookingFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bookingService = inject(BookingService);
  private readonly toastr = inject(ToastrService);
  private readonly lang = inject(LanguageService);

  booking = input<Booking | null>(null);
  customers = input<LookupItem[]>([]);
  workspaces = input<LookupItem[]>([]);
  /** yyyy-MM-dd: لما الحجز يتفتح من زرار + في يوم معيّن */
  defaultDate = input<string | null>(null);

  closeModal = output<void>();
  /** بيطلّع تاريخ الحجز (yyyy-MM-dd) عشان الصفحة تروح لأسبوعه */
  saved = output<string>();

  // Icons
  readonly CalendarPlusIcon = CalendarPlus;
  readonly ClockIcon = Clock;
  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;
  readonly CloseIcon = X;
  readonly UserIcon = UserRound;
  readonly PeopleIcon = Users;
  readonly NoteIcon = FileText;

  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly today = startOfToday();

  /** بدايات سريعة (بالدقائق من بداية اليوم) */
  readonly startSlots = [9, 10, 11, 12, 14, 16].map(h => h * 60);
  readonly durations = [
    { hours: 1, labelKey: 'BOOKINGS.FORM.DURATIONS.H1' },
    { hours: 2, labelKey: 'BOOKINGS.FORM.DURATIONS.H2' },
    { hours: 3, labelKey: 'BOOKINGS.FORM.DURATIONS.H3' },
    { hours: 4, labelKey: 'BOOKINGS.FORM.DURATIONS.H4' }
  ];

  readonly form = this.fb.group(
    {
      customerId: this.fb.control<number | null>(null, Validators.required),
      workspaceId: this.fb.control<number | null>(null, Validators.required),
      bookingDate: this.fb.control<Date | null>(null, Validators.required),
      startTime: this.fb.control<Date | null>(null, Validators.required),
      expectedEndTime: this.fb.control<Date | null>(null),
      numberOfPeople: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
      notes: ['']
    },
    { validators: endAfterStart }
  );

  get isEdit(): boolean {
    return !!this.booking();
  }

  /** locale الحالي للتواريخ والأوقات */
  private get locale(): string {
    return this.lang.currentLang() === 'ar' ? 'ar-EG' : 'en-US';
  }

  /** ترجمة مع استبدال {{param}} (لأن lang.t مش بتاخد params) */
  private tr(key: string, params: Record<string, string | number> = {}): string {
    return Object.entries(params).reduce(
      (text, [k, v]) => text.replaceAll(`{{${k}}}`, String(v)),
      this.lang.t(key)
    );
  }

  ngOnInit(): void {
    const b = this.booking();

    if (b) {
      const asTime = (v?: string | null): Date | null => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : timeDate(d.getHours() * 60 + d.getMinutes());
      };

      this.form.patchValue({
        customerId: b.customerId,
        workspaceId: b.workspaceId,
        bookingDate: parseKey(b.bookingDate),
        startTime: asTime(b.startTime),
        expectedEndTime: asTime(b.expectedEndTime),
        numberOfPeople: b.numberOfPeople,
        notes: b.notes ?? ''
      });
      return;
    }

    // حجز جديد: ممنوع تاريخ قديم
    const dateCtrl = this.form.controls.bookingDate;
    dateCtrl.addValidators(notPastDate);

    const def = this.defaultDate();
    if (def) dateCtrl.setValue(parseKey(def));
    dateCtrl.updateValueAndValidity();
  }

  // ---------- Form helpers ----------
  showError(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorOf(name: string): string {
    const e = this.form.get(name)?.errors;
    if (e?.['required']) return this.lang.t('BOOKINGS.FORM.ERRORS.REQUIRED');
    if (e?.['min']) return this.lang.t('BOOKINGS.FORM.ERRORS.MIN_ONE');
    if (e?.['pastDate']) return this.lang.t('BOOKINGS.FORM.ERRORS.PAST_DATE');
    return this.lang.t('BOOKINGS.FORM.ERRORS.INVALID');
  }

  // ---------- Quick date ----------
  setDateOffset(days: number): void {
    const d = startOfToday();
    d.setDate(d.getDate() + days);
    this.form.controls.bookingDate.setValue(d);
    this.form.controls.bookingDate.markAsDirty();
  }

  isDateOffset(days: number): boolean {
    const v = this.form.controls.bookingDate.value;
    const d = startOfToday();
    d.setDate(d.getDate() + days);
    return !!v && dateKey(v) === dateKey(d);
  }

  // ---------- Quick start ----------
  setStart(min: number): void {
    this.form.controls.startTime.setValue(timeDate(min));
    this.form.controls.startTime.markAsDirty();
  }

  isStartSlot(min: number): boolean {
    return minutesOf(this.form.controls.startTime.value) === min;
  }

  // ---------- Quick duration ----------
  setDuration(hours: number): void {
    const start = minutesOf(this.form.controls.startTime.value);
    if (start === null || this.isDurationDisabled(hours)) return;
    this.form.controls.expectedEndTime.setValue(timeDate(start + hours * 60));
    this.form.controls.expectedEndTime.markAsDirty();
  }

  /** الشريحة تتعطل لو مفيش بداية أو النهاية هتعدي منتصف الليل */
  isDurationDisabled(hours: number): boolean {
    const start = minutesOf(this.form.controls.startTime.value);
    return start === null || start + hours * 60 > 23 * 60 + 59;
  }

  isDuration(hours: number): boolean {
    return this.durationMinutes() === hours * 60;
  }

  durationMinutes(): number | null {
    const start = minutesOf(this.form.controls.startTime.value);
    const end = minutesOf(this.form.controls.expectedEndTime.value);
    return start !== null && end !== null && end > start ? end - start : null;
  }

  // ---------- People stepper ----------
  changePeople(delta: number): void {
    const current = Number(this.form.controls.numberOfPeople.value) || 1;
    this.form.controls.numberOfPeople.setValue(Math.max(1, current + delta));
    this.form.controls.numberOfPeople.markAsDirty();
  }

  // ---------- Display ----------
  fmt12(min: number): string {
    return timeDate(min).toLocaleTimeString(this.locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  summary(): string {
    const { bookingDate, startTime, expectedEndTime } = this.form.getRawValue();
    const start = minutesOf(startTime);
    if (!bookingDate || start === null) return '';

    const day = bookingDate.toLocaleDateString(this.locale, { weekday: 'long', day: 'numeric', month: 'long' });
    let text = `${day} · ${this.fmt12(start)}`;

    const mins = this.durationMinutes();
    const end = minutesOf(expectedEndTime);
    if (end !== null && mins) {
      const arrow = this.lang.currentLang() === 'ar' ? '←' : '→';
      text += ` ${arrow} ${this.fmt12(end)} (${this.durationLabel(mins)})`;
    }
    return text;
  }

  private durationLabel(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;

    const hours =
      h === 0 ? ''
      : h === 1 ? this.lang.t('BOOKINGS.FORM.DURATION.HOUR_ONE')
      : h === 2 ? this.lang.t('BOOKINGS.FORM.DURATION.HOUR_TWO')
      : h <= 10 ? this.tr('BOOKINGS.FORM.DURATION.HOURS_FEW', { n: h })
      : this.tr('BOOKINGS.FORM.DURATION.HOURS_MANY', { n: h });

    if (m === 0) return hours;
    if (h === 0) return this.tr('BOOKINGS.FORM.DURATION.MINUTES_ONLY', { m });
    return this.tr('BOOKINGS.FORM.DURATION.HOURS_AND_MINUTES', { hours, m });
  }

  // ---------- Save ----------
  save(): void {
    if (this.isSubmitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const key = dateKey(v.bookingDate!);

    const dto: CreateBookingDto = {
      customerId: Number(v.customerId),
      workspaceId: Number(v.workspaceId),
      bookingDate: `${key}T00:00:00`,
      startTime: `${key}T${hhmm(v.startTime!)}:00`,
      expectedEndTime: v.expectedEndTime ? `${key}T${hhmm(v.expectedEndTime)}:00` : null,
      numberOfPeople: Number(v.numberOfPeople),
      notes: v.notes?.trim() || null
    };

    const current = this.booking();
    const request$: Observable<unknown> = current
      ? this.bookingService.updateBooking(current.id, dto)
      : this.bookingService.createBooking(dto);

    this.isSubmitting.set(true);
    this.formError.set(null);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastr.success(
          this.lang.t(current ? 'BOOKINGS.FORM.TOAST.UPDATED' : 'BOOKINGS.FORM.TOAST.CREATED')
        );
        this.saved.emit(key);
      },
      error: err => {
        const msg = this.extractError(err);
        this.isSubmitting.set(false);
        this.formError.set(msg);
        this.toastr.error(msg);
      }
    });
  }

  close(): void {
    if (this.isSubmitting()) return;
    this.closeModal.emit();
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
    return this.lang.t('BOOKINGS.FORM.ERRORS.SAVE');
  }
}