import { Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { RoundingMode, TypePricingConfig } from '../../Ipricing';

type PriceControl = 'hourlyRate' | 'minimumCharge' | 'fullDayMaximum';

const pricingFormValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const { minimumCharge, fullDayMaximum, roundingMode, roundingMinutes } = control.value;
  const errors: ValidationErrors = {};

  if (roundingMode !== 'none' && !(Number.isInteger(roundingMinutes) && roundingMinutes > 0)) {
    errors['roundingMinutes'] = true;
  }
  if (minimumCharge && fullDayMaximum && fullDayMaximum < minimumCharge) {
    errors['maxBelowMin'] = true;
  }
  return Object.keys(errors).length ? errors : null;
};

/**
 * فورم تسعير نوع مساحة واحد. Presentational: مبيكلمش الـ API،
 * بيستلم config ويطلّع config جديد عن طريق (save).
 */
@Component({
  selector: 'app-type-pricing-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './type-pricing-form.component.html',
})
export class TypePricingFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly config = input.required<TypePricingConfig>();
  readonly isSaving = input(false);
  readonly save = output<TypePricingConfig>();

  readonly priceFields: {
    control: PriceControl;
    labelKey: string;
    unitKey: string;
    hintKey: string;
    required: boolean;
  }[] = [
    {
      control: 'hourlyRate',
      labelKey: 'PRICING.FORM.FIELDS.HOURLY_RATE',
      unitKey: 'PRICING.FORM.UNITS.PER_HOUR',
      hintKey: 'PRICING.FORM.HINTS.HOURLY_RATE',
      required: true,
    },
    {
      control: 'minimumCharge',
      labelKey: 'PRICING.FORM.FIELDS.MIN_CHARGE',
      unitKey: 'PRICING.COMMON.CURRENCY',
      hintKey: 'PRICING.FORM.HINTS.MIN_CHARGE',
      required: false,
    },
    {
      control: 'fullDayMaximum',
      labelKey: 'PRICING.FORM.FIELDS.MAX_CHARGE',
      unitKey: 'PRICING.COMMON.CURRENCY',
      hintKey: 'PRICING.FORM.HINTS.MAX_CHARGE',
      required: false,
    },
  ];

  readonly roundingOptions: { value: RoundingMode; labelKey: string }[] = [
    { value: 'none', labelKey: 'PRICING.FORM.ROUNDING.NONE' },
    { value: 'up', labelKey: 'PRICING.FORM.ROUNDING.UP' },
    { value: 'down', labelKey: 'PRICING.FORM.ROUNDING.DOWN' },
  ];

  readonly form = this.fb.group(
    {
      hourlyRate: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
      minimumCharge: this.fb.control<number | null>(null, Validators.min(0)),
      fullDayMaximum: this.fb.control<number | null>(null, Validators.min(0)),
      roundingMode: this.fb.control<RoundingMode>('none'),
      roundingMinutes: this.fb.control<number | null>(null),
    },
    { validators: pricingFormValidator },
  );

  constructor() {
    // كل ما الـ config يتغيّر (بعد الحفظ والتحديث من السيرفر) نرجّع الفورم لحالته النضيفة
    effect(() => {
      const { hourlyRate, minimumCharge, fullDayMaximum, rounding } = this.config();
      this.form.reset({
        hourlyRate,
        minimumCharge,
        fullDayMaximum,
        roundingMode: rounding.mode,
        roundingMinutes: rounding.minutes,
      });
    });
  }

  isInvalid(control: PriceControl): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  /** بيرجّع مفتاح الترجمة، والـ template بيترجمه */
  errorKey(control: PriceControl): string {
    return control === 'hourlyRate'
      ? 'PRICING.FORM.ERRORS.RATE_POSITIVE'
      : 'PRICING.FORM.ERRORS.NEGATIVE';
  }

  get roundingMinutesInvalid(): boolean {
    const c = this.form.controls.roundingMinutes;
    return !!this.form.errors?.['roundingMinutes'] && (c.touched || c.dirty);
  }

  get maxBelowMin(): boolean {
    return !!this.form.errors?.['maxBelowMin'] && this.form.dirty;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      hourlyRate: value.hourlyRate,
      minimumCharge: value.minimumCharge,
      fullDayMaximum: value.fullDayMaximum,
      rounding: {
        mode: value.roundingMode,
        minutes: value.roundingMode === 'none' ? null : value.roundingMinutes,
      },
    });
  }
}