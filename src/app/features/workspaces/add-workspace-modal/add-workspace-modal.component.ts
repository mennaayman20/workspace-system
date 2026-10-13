import { Component, OnInit, inject, signal, computed, input, output, DestroyRef } from '@angular/core';
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
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import {
  Building2, LayoutGrid, LucideAngularModule, MapPin, Minus, Plus, Users, FileText, X,
} from 'lucide-angular';

import { CreateWorkspaceCommand, Workspace, WorkspaceType } from '../../../core/interfaces/Iworkspace';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف


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
  imports: [
    ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule, SelectModule,
    TranslatePipe,
  ],
  templateUrl: './add-workspace-modal.component.html',
})
export class CreateWorkspaceModalComponent implements OnInit {
  readonly NEW_TYPE_VALUE = '__new__';

  // Icons
  readonly BuildingIcon = Building2;
  readonly TypeIcon = LayoutGrid;
  readonly PinIcon = MapPin;
  readonly UsersIcon = Users;
  readonly TextIcon = FileText;
  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;
  readonly CloseIcon = X;

  readonly capacityPresets = [2, 4, 8, 12, 20];

  workspaceTypes = input<WorkspaceType[]>([]);
  workspaceToEdit = input<Workspace | null>(null);

  closeModal = output<void>();
  saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);
  private readonly lang = inject(LanguageService);

  isSubmitting = signal(false);
  isLoadingTranslations = signal(false);
  errorMessage = signal<string | null>(null);
  addingNewType = signal(false);

  /** خيارات الدروب داون: الأنواع + "إضافة نوع جديد" في الآخر */
  readonly typeOptions = computed(() => [
    ...this.workspaceTypes().map((t) => ({
      label: t.name || t.nameAr || t.nameEn || `#${t.id}`,
      value: t.id as number | string,
      isNew: false,
    })),
    {
      label: this.lang.t('WORKSPACES.MODAL.ADD_NEW_TYPE'),
      value: this.NEW_TYPE_VALUE as number | string,
      isNew: true,
    },
  ]);

  /** If the type was created but the workspace call failed, reuse it on retry (no duplicate types). */
  private createdType: { key: string; id: number } | null = null;

  readonly form = this.fb.group({
    workspaceTypeId: this.fb.control<number | string | null>(null, [Validators.required]),
    newTypeNameAr: [''],
    newTypeNameEn: [''],
    nameAr: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(100)]],
    nameEn: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(100)]],
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
    descriptionAr: ['', [Validators.maxLength(500)]],
    descriptionEn: ['', [Validators.maxLength(500)]]
  });

  get isEditMode(): boolean {
    return !!this.workspaceToEdit();
  }

  ngOnInit(): void {
    const edit = this.workspaceToEdit();
    if (edit) {
      // بيانات فورية
      this.form.patchValue({
        workspaceTypeId: edit.workspaceTypeId,
        nameAr: edit.nameAr ?? '',
        nameEn: edit.nameEn ?? '',
        code: edit.code,
        floor: edit.floor,
        location: edit.location,
        capacity: edit.capacity,
        descriptionAr: edit.descriptionAr ?? '',
        descriptionEn: edit.descriptionEn ?? ''
      });

      // الاسم والوصف باللغتين
      this.isLoadingTranslations.set(true);
      this.workspaceService
        .getWorkspaceTranslations(edit.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (t) => {
            this.form.patchValue(t);
            this.isLoadingTranslations.set(false);
          },
          error: () => this.isLoadingTranslations.set(false)
        });
    }

    // Toggle the "new type" validators only when that option is selected
    this.form.controls.workspaceTypeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const isNew = value === this.NEW_TYPE_VALUE;
        const ar = this.form.controls.newTypeNameAr;
        const en = this.form.controls.newTypeNameEn;
        this.addingNewType.set(isNew);

        if (isNew) {
          const base = [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(50)];
          ar.setValidators([...base, this.uniqueTypeName()]);
          en.setValidators([...base, this.uniqueTypeName()]);
        } else {
          ar.clearValidators();
          en.clearValidators();
          ar.reset('');
          en.reset('');
        }
        ar.updateValueAndValidity();
        en.updateValueAndValidity();
      });
  }

  /** بيقارن بكل الأسماء المتاحة للأنواع الموجودة (المترجم والعربي والإنجليزي) */
  private uniqueTypeName(): ValidatorFn {
    return (c) => {
      const v = String(c.value ?? '').trim().toLowerCase();
      if (!v) return null;
      const exists = this.workspaceTypes().some((t) =>
        [t.name, t.nameAr, t.nameEn].some((n) => (n ?? '').trim().toLowerCase() === v)
      );
      return exists ? { duplicate: true } : null;
    };
  }

  // ---------- Template helpers ----------
  /** Returns a translated error message for a control, only after the user touched it. */
  fieldError(name: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[name];
    if (!c || !(c.touched || c.dirty) || !c.errors) return null;

    const e = c.errors;
    const t = (k: string, p?: Record<string, unknown>) => this.lang.t('VALIDATION.' + k, p);

    if (e['required'] || e['blank']) return t('REQUIRED');
    if (e['minlength']) return t('MIN_LENGTH', { n: e['minlength'].requiredLength });
    if (e['maxlength']) return t('MAX_LENGTH', { n: e['maxlength'].requiredLength });
    if (e['pattern']) return t('PATTERN');
    if (e['min']) return t('MIN', { n: e['min'].min });
    if (e['max']) return t('MAX', { n: e['max'].max });
    if (e['integer']) return t('INTEGER');
    if (e['duplicate']) return t('DUPLICATE');
    return t('INVALID');
  }

  // ---------- Submit ----------
  onSubmit(): void {
    if (this.isSubmitting() || this.isLoadingTranslations()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const editData = this.workspaceToEdit();
    const newTypeAr = (raw.newTypeNameAr ?? '').trim();
    const newTypeEn = (raw.newTypeNameEn ?? '').trim();
    const newTypeKey = `${newTypeAr}|${newTypeEn}`;

    let typeId$: Observable<number>;
    if (this.addingNewType()) {
      typeId$ =
        this.createdType?.key === newTypeKey
          ? of(this.createdType.id)
          : this.workspaceService
              .createWorkspaceType({
                nameAr: newTypeAr,
                nameEn: newTypeEn,
                descriptionAr: null,
                descriptionEn: null
              })
              .pipe(tap((id) => (this.createdType = { key: newTypeKey, id })));
    } else {
      typeId$ = of(Number(raw.workspaceTypeId));
    }

    typeId$
      .pipe(
        switchMap((workspaceTypeId) => {
          const command: CreateWorkspaceCommand = {
            workspaceTypeId,
            nameAr: (raw.nameAr ?? '').trim(),
            nameEn: (raw.nameEn ?? '').trim(),
            code: (raw.code ?? '').trim().toUpperCase(),
            floor: (raw.floor ?? '').trim(),
            location: (raw.location ?? '').trim(),
            capacity: Number(raw.capacity),
            descriptionAr: (raw.descriptionAr ?? '').trim() || null,
            descriptionEn: (raw.descriptionEn ?? '').trim() || null
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
          this.toastr.success(this.lang.t(editData ? 'WORKSPACES.MODAL.EDITED' : 'WORKSPACES.MODAL.ADDED'));
          this.saved.emit();
          this.closeModal.emit();
        },
        error: (err: unknown) => {
          const msg = this.resolveError(err, !!editData);
          this.isSubmitting.set(false);
          this.errorMessage.set(msg);
          this.toastr.error(msg);
        }
      });
  }

  private resolveError(err: unknown, isEdit: boolean): string {
    const t = (k: string) => this.lang.t('WORKSPACES.MODAL.' + k);
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return t('ERR_OFFLINE');
      if (err.status === 409) return t('ERR_CODE_EXISTS');
      const serverMsg = err.error?.message ?? err.error?.title;
      if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
    }
    return t(isEdit ? 'ERR_EDIT' : 'ERR_ADD');
  }

  // ---------- Close ----------
  onClose(): void {
    if (this.isSubmitting()) return;
    this.closeModal.emit();
  }

  // ---------- Capacity ----------
  changeCapacity(delta: number): void {
    const current = Number(this.form.controls.capacity.value) || 1;
    this.setCapacity(current + delta);
  }

  setCapacity(value: number): void {
    const ctrl = this.form.controls.capacity;
    ctrl.setValue(Math.min(1000, Math.max(1, value)));
    ctrl.markAsDirty();
  }
}