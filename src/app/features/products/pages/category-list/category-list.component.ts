import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductCategoryService } from '../../services/product-category.service';
import { ProductCategory, CreateProductCategoryCommand } from '../../interfaces/product';
import { 
  LucideAngularModule, 
  FolderTreeIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SaveIcon, 
  XIcon ,
  PackageIcon
} from 'lucide-angular';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule , RouterLink,RouterLinkActive],
  templateUrl: './category-list.component.html'
})
export class CategoryListComponent implements OnInit {
  categoryService = inject(ProductCategoryService);
  private fb = inject(NonNullableFormBuilder);

  // Icons
  readonly FolderTreeIcon = FolderTreeIcon;
  readonly PlusIcon = PlusIcon;
  readonly EditIcon = EditIcon;
  readonly TrashIcon = TrashIcon;
  readonly SaveIcon = SaveIcon;
  readonly XIcon = XIcon;
  readonly PackageIcon = PackageIcon;

  // Signals State Management
  isFormOpen = signal<boolean>(false);
  selectedCategoryForEdit = signal<ProductCategory | null>(null);

  // Form Group
  categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe();
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const command = this.categoryForm.getRawValue() as CreateProductCategoryCommand;
    const currentCategory = this.selectedCategoryForEdit();

    if (currentCategory) {
      // Update Mode
      this.categoryService.updateCategory(currentCategory.id, command).subscribe({
        next: () => this.resetForm()
      });
    } else {
      // Create Mode
      this.categoryService.createCategory(command).subscribe({
        next: () => this.resetForm()
      });
    }
  }

  openAddForm(): void {
    this.resetForm();
    this.isFormOpen.set(true);
  }

  editCategory(category: ProductCategory): void {
    this.selectedCategoryForEdit.set(category);
    this.categoryForm.patchValue({
      name: category.name ?? '',
      description: category.description ?? '',
      isActive: category.isActive ?? true
    });
    this.isFormOpen.set(true);
  }

  deleteCategory(id: number): void {
    if (confirm('هل أنت تأكد من حذف هذا التصنيف؟')) {
      this.categoryService.deleteCategory(id).subscribe();
    }
  }

  restoreCategory(id: number): void {
    this.httpPatchRestore(id);
  }

  private httpPatchRestore(id: number): void {
    this.categoryService.getCategories().subscribe();
  }

  resetForm(): void {
    this.selectedCategoryForEdit.set(null);
    this.categoryForm.reset({
      name: '',
      description: '',
      isActive: true
    });
    this.isFormOpen.set(false);
  }
}