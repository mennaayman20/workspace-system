import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import {
  ApiResponse, PagedResult,
  Product, CreateProductCommand, AddProductCommand
} from '../interfaces/product';
import { environment } from '../../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Product`;

  products = signal<Product[]>([]);
  isLoading = signal<boolean>(false);

  getProducts(): Observable<Product[]> {
    this.isLoading.set(true);
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

    return this.http
      .get<ApiResponse<PagedResult<Product>>>(this.baseUrl, { params })
      .pipe(
        map((res) => res.data.items),
        tap({
          next: (items) => {
            this.products.set(items);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        })
      );
  }

  createProduct(command: CreateProductCommand): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(this.baseUrl, command).pipe(
      switchMap((res) => this.getProducts().pipe(map(() => res.data)))
    );
  }

  updateProduct(id: number, command: Partial<CreateProductCommand>): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, command).pipe(
      switchMap(() => this.getProducts()),
      map(() => void 0)
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      switchMap(() => this.getProducts()),
      map(() => void 0)
    );
  }

  restoreProduct(id: number): Observable<void> {
    return this.http.patch<ApiResponse<unknown>>(`${this.baseUrl}/${id}/restore`, {}).pipe(
      switchMap(() => this.getProducts()),
      map(() => void 0)
    );
  }

  addProductToSession(command: AddProductCommand): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/add-to-session`, command).pipe(
      map(() => void 0)
    );
  }
}