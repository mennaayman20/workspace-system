import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CreateWorkspaceDto, Workspace } from '../interfaces/Iworkspace';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly STORAGE_KEY = 'mock_workspaces_db';

  // البيانات الافتراضية
  private initialWorkspaces: Workspace[] = [
    {
      id: 'ws-101',
      name: 'Meeting Room 01',
      type: 'Meeting Room',
      capacity: 10,
      status: 'Occupied',
      location: 'الدور الأول - الفرع الرئيسي',
      pricingPlanName: 'ساعة اجتماعات - 150 ج.م',
      isActive: true
    },
    {
      id: 'ws-102',
      name: 'Meeting Room 02',
      type: 'Meeting Room',
      capacity: 6,
      status: 'Available',
      location: 'الدور الأول - الفرع الرئيسي',
      pricingPlanName: 'ساعة اجتماعات - 150 ج.م',
      isActive: true
    },
    {
      id: 'ws-103',
      name: 'Open Workspace Desk A',
      type: 'Open Workspace',
      capacity: 40,
      status: 'Available',
      location: 'الدور الأرضي',
      pricingPlanName: 'ساعة مفتوحة - 30 ج.م',
      isActive: true
    },
    {
      id: 'ws-104',
      name: 'Private Office 01',
      type: 'Private Office',
      capacity: 4,
      status: 'Reserved',
      location: 'الدور الثاني',
      pricingPlanName: 'مكتب خاص يومي - 500 ج.م',
      isActive: true
    }
  ];

  constructor() {
    this.initStorage();
  }

  // تهيئة البيانات في الـ localStorage أول مرة فقط
  private initStorage(): void {
    const existingData = localStorage.getItem(this.STORAGE_KEY);
    if (!existingData) {
      this.saveToStorage(this.initialWorkspaces);
    }
  }

  // دالة مساعدة لقراءة البيانات من LocalStorage
  private getFromStorage(): Workspace[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // دالة مساعدة لحفظ البيانات في LocalStorage
  private saveToStorage(data: Workspace[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // جلب كافة المساحات
  getWorkspaces(): Observable<Workspace[]> {
    const workspaces = this.getFromStorage();
    return of([...workspaces]).pipe(delay(500));
  }

  // إضافة مساحة جديدة
  createWorkspace(dto: CreateWorkspaceDto): Observable<Workspace> {
    const workspaces = this.getFromStorage();
    
    const newWorkspace: Workspace = {
      ...dto,
      id: `ws-${Date.now()}`,
      status: 'Available'
    };

    workspaces.unshift(newWorkspace);
    this.saveToStorage(workspaces);

    return of(newWorkspace).pipe(delay(400));
  }

  // تعديل مساحة
  updateWorkspace(id: string, dto: Partial<CreateWorkspaceDto>): Observable<Workspace> {
    const workspaces = this.getFromStorage();
    const index = workspaces.findIndex(w => w.id === id);

    if (index !== -1) {
      workspaces[index] = { ...workspaces[index], ...dto };
      this.saveToStorage(workspaces);
      return of(workspaces[index]).pipe(delay(400));
    }

    return throwError(() => new Error('المساحة غير موجودة'));
  }

  // حذف مساحة
  deleteWorkspace(id: string): Observable<boolean> {
    let workspaces = this.getFromStorage();
    workspaces = workspaces.filter(w => w.id !== id);
    this.saveToStorage(workspaces);

    return of(true).pipe(delay(300));
  }
}