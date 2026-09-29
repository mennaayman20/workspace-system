import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from './company.service';
import { Company } from './Icompany';
import { AddCompanyModalComponent } from './add-company-modal/add-company-modal.component';
import { LucideAngularModule, Building2, Plus } from 'lucide-angular';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, AddCompanyModalComponent, LucideAngularModule],
  templateUrl: './company.component.html'
})
export class CompanyComponent implements OnInit {
  private companyService = inject(CompanyService);

  // State Management using Signals
  companies = signal<Company[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Modal State
  isModalOpen = signal<boolean>(false);
  editingCompany = signal<Company | null>(null);

  // Icons
  readonly BuildingIcon = Building2;
  readonly PlusIcon = Plus;

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies(searchTerm: string = '') {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = searchTerm.trim()
      ? this.companyService.searchCompanies(searchTerm)
      : this.companyService.getCompanies();

    request$.subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.companies.set(res);
        } else if (res && Array.isArray(res.items)) {
          this.companies.set(res.items);
        } else if (res?.data && Array.isArray(res.data.items)) {
          this.companies.set(res.data.items);
        } else if (res && Array.isArray(res.data)) {
          this.companies.set(res.data);
        } else {
          this.companies.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('حدث خطأ أثناء تحميل بيانات الشركات.');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string) {
    this.loadCompanies(term);
  }

  openAddModal() {
    this.editingCompany.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(company: Company) {
    this.editingCompany.set(company);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingCompany.set(null);
  }

  refreshAfterSave() {
    this.closeModal();
    this.loadCompanies();
  }

  onToggleStatus(company: Company) {
    const newStatus = !company.isActive;
    this.companyService.changeStatus({ id: company.id, isActive: newStatus }).subscribe({
      next: () => {
        this.loadCompanies();
      },
      error: () => {
        alert('تعذر تغيير حالة الشركة.');
      }
    });
  }

  onDelete(id: number) {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذه الشركة؟')) {
      this.companyService.deleteCompany(id).subscribe({
        next: () => {
          this.loadCompanies();
        },
        error: () => {
          alert('تعذر حذف الشركة، قد تكون مرتبطة ببيانات أخرى في النظام.');
        }
      });
    }
  }
}