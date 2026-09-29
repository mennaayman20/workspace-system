// import { Injectable, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, shareReplay, tap } from 'rxjs';
// import {
//   Customer,
//   Company,
//   CreateCustomerCommand,
//   UpdateCustomerCommand,
//   CreateCompanyCommand,
//   UpdateCompanyCommand
// } from '../interfaces/Icustomer';
// import { environment } from '../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class CustomerService {
//   private readonly http = inject(HttpClient);
//   private readonly baseUrl = `${environment.apiUrl}/api`;

//   private customersCache$?: Observable<Customer[]>;
//   private companiesCache$?: Observable<Company[]>;

//   getCustomers(forceRefresh = false): Observable<Customer[]> {
//     if (!this.customersCache$ || forceRefresh) {
//       this.customersCache$ = this.http
//         .get<Customer[]>(`${this.baseUrl}/Customer`)
//         .pipe(shareReplay(1));
//     }
//     return this.customersCache$;
//   }

//   getCompanies(forceRefresh = false): Observable<Company[]> {
//     if (!this.companiesCache$ || forceRefresh) {
//       this.companiesCache$ = this.http
//         .get<Company[]>(`${this.baseUrl}/Company`)
//         .pipe(shareReplay(1));
//     }
//     return this.companiesCache$;
//   }

//   getCustomerById(id: number): Observable<Customer> {
//     return this.http.get<Customer>(`${this.baseUrl}/Customer/${id}`);
//   }

//   createCustomer(cmd: CreateCustomerCommand): Observable<Customer> {
//     return this.http.post<Customer>(`${this.baseUrl}/Customer`, cmd).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   updateCustomer(cmd: UpdateCustomerCommand): Observable<void> {
//     return this.http.put<void>(`${this.baseUrl}/Customer/${cmd.id}`, cmd).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   deleteCustomer(id: number): Observable<void> {
//     return this.http.delete<void>(`${this.baseUrl}/Customer/${id}`).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   createCompany(cmd: CreateCompanyCommand): Observable<Company> {
//     return this.http.post<Company>(`${this.baseUrl}/Company`, cmd).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   updateCompany(cmd: UpdateCompanyCommand): Observable<void> {
//     return this.http.put<void>(`${this.baseUrl}/Company/${cmd.id}`, cmd).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   deleteCompany(id: number): Observable<void> {
//     return this.http.delete<void>(`${this.baseUrl}/Company/${id}`).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   changeCompanyStatus(id: number, isActive: boolean): Observable<void> {
//     return this.http.patch<void>(`${this.baseUrl}/Company/${id}/status`, { id, isActive }).pipe(
//       tap(() => this.clearCache())
//     );
//   }

//   private clearCache(): void {
//     this.customersCache$ = undefined;
//     this.companiesCache$ = undefined;
//   }
// }