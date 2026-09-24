import { Component, OnInit, inject, signal, input, output, DestroyRef } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, switchMap, tap } from 'rxjs';

import { WorkspaceService } from '../../../core/services/workspace.service';
import { CreateWorkspaceCommand, Workspace, WorkspaceType } from '../../../core/interfaces/Iworkspace';

// ---------- Custom validators ----------
/** Rejects values that are only whitespace (Validators.required accepts "   "). */
const notBlank: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.length > 0 && c.value.trim() === '' ? { blank: true } : null;

/** Rejects decimals like 2.5 (Validators.min doesn't). */
const integer: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  c.value === null || c.value === '' || Number.isInteger(Number(c.value)) ? null : { integer: true };

@Component({
  selector: 'app-add-workspace-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-workspace-modal.component.html',
  host: { '(document:keydown.escape)': 'onEscape()' }
})
export class CreateWorkspaceModalComponent implements OnInit {
  readonly NEW_TYPE_VALUE = '__new__';

  workspaceTypes = input<WorkspaceType[]>([]);
  workspaceToEdit = input<Workspace | null>(null);

  closeModal = output<void>();
  saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  addingNewType = signal(false);

  /** If the type was created but the workspace call failed, reuse it on retry (no duplicate types). */
  private createdType: { name: string; id: number } | null = null;

  readonly form = this.fb.group({
    workspaceTypeId: this.fb.control<number | string | null>(null, [Validators.required]),
    newTypeName: [''],
    name: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(100)]],
    code: [
      '',
      [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_-]+$/)]
    ],
    floor: ['', [Validators.required, notBlank, Validators.maxLength(50)]],
    location: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    capacity: this.fb.control<number | null>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(1000),
      integer
    ]),
    description: ['', [Validators.maxLength(500)]]
  });

  get isEditMode(): boolean {
    return !!this.workspaceToEdit();
  }

  ngOnInit(): void {
    const edit = this.workspaceToEdit();
    if (edit) {
      this.form.patchValue({
        workspaceTypeId: edit.workspaceTypeId,
        name: edit.name,
        code: edit.code,
        floor: edit.floor,
        location: edit.location,
        capacity: edit.capacity,
        description: edit.description ?? ''
      });
    }

    // Toggle the "new type name" validators only when that option is selected
    this.form.controls.workspaceTypeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const isNew = value === this.NEW_TYPE_VALUE;
        const ctrl = this.form.controls.newTypeName;
        this.addingNewType.set(isNew);
        if (isNew) {
          ctrl.setValidators([
            Validators.required,
            notBlank,
            Validators.minLength(2),
            Validators.maxLength(50),
            this.uniqueTypeName()
          ]);
        } else {
          ctrl.clearValidators();
          ctrl.reset('');
        }
        ctrl.updateValueAndValidity();
      });
  }

  private uniqueTypeName(): ValidatorFn {
    return (c) => {
      const v = String(c.value ?? '').trim().toLowerCase();
      if (!v) return null;
      return this.workspaceTypes().some((t) => t.name.trim().toLowerCase() === v) ? { duplicate: true } : null;
    };
  }

  // ---------- Template helpers ----------
  /** Returns an Arabic error message for a control, only after the user touched it. */
  fieldError(name: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[name];
    if (!c || !(c.touched || c.dirty) || !c.errors) return null;

    const e = c.errors;
    if (e['required'] || e['blank']) return 'هذا الحقل مطلوب';
    if (e['minlength']) return `يجب ألا يقل عن ${e['minlength'].requiredLength} أحرف`;
    if (e['maxlength']) return `يجب ألا يزيد عن ${e['maxlength'].requiredLength} حرفاً`;
    if (e['pattern']) return 'استخدم حروفاً إنجليزية وأرقاماً و - أو _ فقط (بدون مسافات)';
    if (e['min']) return `القيمة يجب ألا تقل عن ${e['min'].min}`;
    if (e['max']) return `القيمة يجب ألا تزيد عن ${e['max'].max}`;
    if (e['integer']) return 'يجب إدخال رقم صحيح';
    if (e['duplicate']) return 'هذا النوع موجود بالفعل، اختره من القائمة';
    return 'قيمة غير صالحة';
  }

  // ---------- Submit ----------
  onSubmit(): void {
    if (this.isSubmitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const editData = this.workspaceToEdit();
    const newTypeName = (raw.newTypeName ?? '').trim();

    let typeId$: Observable<number>;
    if (this.addingNewType()) {
      typeId$ =
        this.createdType?.name === newTypeName
          ? of(this.createdType.id)
          : this.workspaceService
              .createWorkspaceType({ name: newTypeName })
              .pipe(tap((id) => (this.createdType = { name: newTypeName, id })));
    } else {
      typeId$ = of(Number(raw.workspaceTypeId));
    }

    typeId$
      .pipe(
        switchMap((workspaceTypeId) => {
          const command: CreateWorkspaceCommand = {
            workspaceTypeId,
            name: (raw.name ?? '').trim(),
            code: (raw.code ?? '').trim().toUpperCase(),
            floor: (raw.floor ?? '').trim(),
            location: (raw.location ?? '').trim(),
            capacity: Number(raw.capacity),
            description: (raw.description ?? '').trim()
          };

          const request$: Observable<Workspace | void> = editData
            ? this.workspaceService.updateWorkspace(editData.id, { ...command, id: editData.id })
            : this.workspaceService.createWorkspace(command);

          return request$;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.resolveError(err, !!editData));
        }
      });
  }

  private resolveError(err: unknown, isEdit: boolean): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'تعذر الاتصال بالسيرفر، تأكد من الإنترنت وأعد المحاولة';
      if (err.status === 409) return 'كود المساحة مستخدم بالفعل، اختر كوداً آخر';
      const serverMsg = err.error?.message ?? err.error?.title;
      if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
    }
    return isEdit ? 'حدث خطأ أثناء تعديل المساحة' : 'حدث خطأ أثناء إضافة المساحة';
  }

  // ---------- Close ----------
  onClose(): void {
    if (this.isSubmitting()) return;
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.onClose();
  }

  onEscape(): void {
    this.onClose();
  }
}