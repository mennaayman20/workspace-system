// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { BookingService } from '../../core/services/booking.service';
// import { WorkspaceService } from '../../core/services/workspace.service';
// import { Booking, CreateBookingDto, Customer } from '../../core/interfaces/Ibooking';
// import { Workspace } from '../../core/interfaces/Iworkspace';
// import { CreateBookingModalComponent } from './components/create-booking-modal/create-booking-modal.component';

// @Component({
//   selector: 'app-bookings',
//   standalone: true,
//   imports: [CommonModule, CreateBookingModalComponent],
//   templateUrl: './bookings.component.html'
// })
// export class BookingsComponent implements OnInit {
//   bookings: Booking[] = [];
//   workspaces: Workspace[] = [];
//   customers: Customer[] = [];

//   isLoading: boolean = false;
//   isSubmitting: boolean = false;
//   isModalOpen: boolean = false;

//   constructor(
//     private bookingService: BookingService,
//     private workspaceService: WorkspaceService
//   ) {}

//   ngOnInit(): void {
//     this.loadData();
//   }

//   loadData(): void {
//     this.isLoading = true;
//     this.bookingService.getBookings().subscribe(data => {
//       this.bookings = data;
//       this.isLoading = false;
//     });

//     this.workspaceService.getWorkspaces().subscribe(ws => this.workspaces = ws);
//     this.bookingService.getCustomers().subscribe(cust => this.customers = cust);
//   }

//   openBookingModal(): void {
//     this.isModalOpen = true;
//   }

//   closeBookingModal(): void {
//     this.isModalOpen = false;
//   }

//   onSaveBooking(dto: CreateBookingDto): void {
//     this.isSubmitting = true;
//     const selectedWs = this.workspaces.find(w => w.id === dto.workspaceId);

//     this.bookingService.createBooking(dto, selectedWs?.name || '', selectedWs?.type || 'Open Workspace').subscribe({
//       next: () => {
//         this.isSubmitting = false;
//         this.closeBookingModal();
//         this.loadData(); // إعادة التحميل وتحديث الجلسات والـ LocalStorage
//       },
//       error: (err) => {
//         this.isSubmitting = false;
//         alert(err.message || 'حدث خطأ أثناء الحفظ');
//       }
//     });
//   }

//   getStatusBadgeClass(status: string): string {
//     switch (status) {
//       case 'Checked-in': return 'bg-emerald-100 text-emerald-800';
//       case 'Confirmed': return 'bg-blue-100 text-blue-800';
//       case 'Pending': return 'bg-amber-100 text-amber-800';
//       default: return 'bg-slate-100 text-slate-700';
//     }
//   }
// }