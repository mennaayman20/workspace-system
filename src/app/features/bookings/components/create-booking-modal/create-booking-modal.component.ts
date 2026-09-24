import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Workspace } from '../../../../core/interfaces/Iworkspace';
import { Customer, CreateBookingDto } from '../../../../core/interfaces/Ibooking';

@Component({
  selector: 'app-create-booking-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-booking-modal.component.html'
})
export class CreateBookingModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() isSubmitting: boolean = false;
  @Input() workspaces: Workspace[] = [];
  @Input() customers: Customer[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitBooking = new EventEmitter<CreateBookingDto>();

  bookingForm!: FormGroup;
  isNewCustomerMode: boolean = false;
  filteredCustomers: Customer[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customers'] && this.customers) {
      this.filteredCustomers = [...this.customers];
    }
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    this.bookingForm = this.fb.group({
      // وضع العميل
      isNewCustomer: [false],
      customerId: [''],
      
      // تفاصيل العميل الجديد
      newCustomer: this.fb.group({
        fullName: [''],
        mobileNumber: [''],
        email: [''],
        company: [''],
        customerType: ['Individual']
      }),

      // تفاصيل الحجز
      workspaceId: ['', [Validators.required]],
      bookingDate: [today, [Validators.required]],
      startTime: [nowTime, [Validators.required]],
      expectedEndTime: [''],
      numberOfPeople: [1, [Validators.required, Validators.min(1)]],
      isDirectCheckIn: [true], // التخفيض الافتراضي: Check-in مباشر
      notes: ['']
    });

    // استمع لتغيرات التبديل بين عميل جديد / عميل قديم
    this.bookingForm.get('isNewCustomer')?.valueChanges.subscribe(isNew => {
      this.isNewCustomerMode = isNew;
      this.updateValidators(isNew);
    });
  }

  private updateValidators(isNew: boolean): void {
    const custIdControl = this.bookingForm.get('customerId');
    const newCustGroup = this.bookingForm.get('newCustomer');

    if (isNew) {
      custIdControl?.clearValidators();
      newCustGroup?.get('fullName')?.setValidators([Validators.required, Validators.minLength(3)]);
      newCustGroup?.get('mobileNumber')?.setValidators([Validators.required, Validators.pattern('^[0-9]{10,15}$')]);
    } else {
      custIdControl?.setValidators([Validators.required]);
      newCustGroup?.get('fullName')?.clearValidators();
      newCustGroup?.get('mobileNumber')?.clearValidators();
    }

    custIdControl?.updateValueAndValidity();
    newCustGroup?.get('fullName')?.updateValueAndValidity();
    newCustGroup?.get('mobileNumber')?.updateValueAndValidity();
  }

  onSearchCustomer(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredCustomers = this.customers.filter(c => 
      c.fullName.toLowerCase().includes(term) || c.mobileNumber.includes(term)
    );
  }

  onClose(): void {
    this.bookingForm.reset({
      isNewCustomer: false,
      bookingDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      numberOfPeople: 1,
      isDirectCheckIn: true
    });
    this.isNewCustomerMode = false;
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const formVal = this.bookingForm.value;
    const dto: CreateBookingDto = {
      workspaceId: formVal.workspaceId,
      bookingDate: formVal.bookingDate,
      startTime: formVal.startTime,
      expectedEndTime: formVal.expectedEndTime,
      numberOfPeople: formVal.numberOfPeople,
      isDirectCheckIn: formVal.isDirectCheckIn,
      notes: formVal.notes,
      customerId: !this.isNewCustomerMode ? formVal.customerId : undefined,
      newCustomer: this.isNewCustomerMode ? formVal.newCustomer : undefined
    };

    this.submitBooking.emit(dto);
  }
}