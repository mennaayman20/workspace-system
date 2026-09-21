import { Routes } from '@angular/router';
import { CustomerFormModalComponent } from './features/customers/components/customer-form-modal/customer-form-modal.component';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard.component';

import { BookingComponent } from './features/bookings/booking/booking.component';
import { PosComponent } from './features/pos/pos/pos.component';
import { PaymentsComponent } from './features/payments/payments/payments.component';
import { WorkspacesComponent } from './features/workspaces/workspaces.component';

export const routes: Routes = [

   {path:'control-panel', component:DashboardComponent },
   {path:'Workspaces', component:WorkspacesComponent },
   {path:'booking', component: BookingComponent },
   {path:'Customers', component:CustomerFormModalComponent },
   
   {path:'pos', component:PosComponent },
   {path:'payments', component:PaymentsComponent },

];
