import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CreateWorkspaceDto, Workspace, WorkspaceType } from '../../../core/interfaces/Iworkspace';

@Component({
  selector: 'app-add-workspace-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-workspace-modal.component.html'
})
export class AddWorkspaceModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() isSubmitting: boolean = false;
  @Input() selectedWorkspace: Workspace | null = null; // نمرر المساحة المراد تعديلها

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<{ id?: string; data: CreateWorkspaceDto }>();

  workspaceForm!: FormGroup;

  workspaceTypes: WorkspaceType[] = [
    'Open Workspace',
    'Private Desk',
    'Dedicated Desk',
    'Meeting Room',
    'Private Office',
    'Training Room',
    'Conference Room'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  // متابعة تغيير المساحة المحددة (تعبئة الـ Form أو إعادة ضبطه)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedWorkspace'] && this.workspaceForm) {
      if (this.selectedWorkspace) {
        // وضع التعديل: ملء الـ Form ببيانات المساحة
        this.workspaceForm.patchValue(this.selectedWorkspace);
      } else {
        // وضع الإضافة: إعادة ضبط الـ Form
        this.resetForm();
      }
    }
  }

  private initForm(): void {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['Meeting Room', [Validators.required]],
      capacity: [1, [Validators.required, Validators.min(1)]],
      location: ['', [Validators.required]],
      description: [''],
      pricingPlanId: [''],
      isActive: [true]
    });

    if (this.selectedWorkspace) {
      this.workspaceForm.patchValue(this.selectedWorkspace);
    }
  }

  private resetForm(): void {
    this.workspaceForm.reset({ type: 'Meeting Room', capacity: 1, isActive: true });
  }

  onClose(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.workspaceForm.invalid) {
      this.workspaceForm.markAllAsTouched();
      return;
    }
    
    // نبعت الـ ID مع البيانات إذا كنا في وضع التعديل
    this.submitForm.emit({
      id: this.selectedWorkspace?.id,
      data: this.workspaceForm.value
    });
  }
}