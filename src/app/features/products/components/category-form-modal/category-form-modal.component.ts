import { Component, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductCategoryService } from '../../services/product-category.service';
import { ProductCategory, CreateProductCategoryCommand } from '../../interfaces/product';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form-modal.component.html'
})
export class CategoryFormModalComponent {
  categoryService = inject(ProductCategoryService);
  private fb = inject(FormBuilder);

  isOpen = input<boolean>(false);
  categoryToEdit = input<ProductCategory | null>(null);

  closeModal = output<void>();
  saved = output<void>();

  categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    isActive: [true]
  });

  constructor() {
    effect(() => {
      const cat = this.categoryToEdit();
      if (cat) {
        this.categoryForm.patchValue({
          name: cat.name,
          description: cat.description || '',
          isActive: cat.isActive
        });
      } else {
        this.resetForm();
      }
    });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) return;

    const command = this.categoryForm.value as CreateProductCategoryCommand;
    const currentCat = this.categoryToEdit();

    if (currentCat) {
      this.categoryService.updateCategory(currentCat.id, command).subscribe({
        next: () => {
          this.saved.emit();
          this.onClose();
        }
      });
    } else {
      this.categoryService.createCategory(command).subscribe({
        next: () => {
          this.saved.emit();
          this.onClose();
        }
      });
    }
  }

  onClose(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  resetForm(): void {
    this.categoryForm.reset({
      name: '',
      description: '',
      isActive: true
    });
  }
}