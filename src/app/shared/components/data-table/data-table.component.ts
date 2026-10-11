import {
  ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, contentChildren,
  input, output, signal, viewChild,
} from '@angular/core';
import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { Popover, PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';
import { EllipsisVertical, Inbox, LucideAngularModule, Search } from 'lucide-angular';

import { CellTemplateDirective, RowActionsDirective } from './data-table.directives';
import {
  ActionTone, BadgeStyle, ColumnFilters, ColumnFilterType, ColumnFilterValue, FilterOption,
  TableAction, TableActionEvent, TableColumn,
} from './table.types';

const NEUTRAL_BADGE = 'bg-slate-100 text-slate-600';

// أزرار الصف (وضع buttons)
const TONE_CLASSES: Record<ActionTone, string> = {
  primary: 'text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white',
  danger:  'text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white',
  warning: 'text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white',
  success: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white',
  neutral: 'text-slate-600 bg-slate-100 hover:bg-slate-200',
};

// عناصر القايمة المنبثقة (وضع menu)
const MENU_TONE_CLASSES: Record<ActionTone, string> = {
  primary: 'text-slate-700 hover:bg-slate-100',
  danger:  'text-rose-600 hover:bg-rose-50',
  warning: 'text-amber-700 hover:bg-amber-50',
  success: 'text-emerald-700 hover:bg-emerald-50',
  neutral: 'text-slate-700 hover:bg-slate-100',
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    TableModule, PopoverModule, DatePickerModule, FormsModule,
    NgTemplateOutlet, CurrencyPipe, LucideAngularModule,
  ],
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = any> {
  readonly SearchIcon = Search;
  readonly MoreIcon = EllipsisVertical;

  // ===== الداتا =====
  readonly value = input.required<T[]>();
  readonly columns = input.required<TableColumn<T>[]>();
  readonly actions = input<TableAction<T>[]>([]);
  readonly loading = input(false);
  /** الحقل اللي بيميّز الصف (للأداء) */
  readonly dataKey = input('id');

  // ===== الخيارات =====
  readonly paginator = input(true);
  readonly rows = input(10);
  readonly rowsPerPageOptions = input<number[]>([10, 25, 50]);
  readonly searchable = input(false);
  readonly searchPlaceholder = input('بحث...');
  /** فلتر لكل عمود تحت الهيدر (مع زرار تطبيق / مسح) */
  readonly columnFilters = input(false);
  readonly applyLabel = input('تطبيق');
  readonly clearLabel = input('مسح');
  readonly allLabel = input('الكل');
  readonly dateFilterPlaceholder = input('اختر نطاقاً');
  readonly showIndex = input(false);
  readonly clickable = input(false);
  readonly minWidth = input('48rem');
  readonly actionsHeader = input('الإجراءات');
  /** 'menu' = قايمة ⋮ (الافتراضي) | 'buttons' = أزرار أيقونات */
  readonly actionsMode = input<'menu' | 'buttons'>('menu');
  /** لغة تنسيق التواريخ: 'ar-EG' أرقام عربية، 'en-US' أرقام إنجليزية */
  readonly locale = input('ar-EG');
  /** كلاسات إضافية لكل صف، مثال: row => busy ? 'opacity-50 pointer-events-none' : '' */
  readonly rowClass = input<(row: T) => string>(() => '');

  // ===== الحالة الفاضية =====
  readonly emptyTitle = input('لا توجد بيانات');
  readonly emptyDescription = input<string | null>(null);
  readonly emptyIcon = input<any>(Inbox);

  // ===== الأحداث =====
  readonly action = output<TableActionEvent<T>>();
  readonly rowClick = output<T>();
  /** بيتطلق لما المستخدم يدوس تطبيق أو مسح (مفيد لو عايزة تفلتري من السيرفر) */
  readonly filtersChange = output<ColumnFilters>();

  private readonly dt = viewChild<Table>('dt');
  private readonly popover = viewChild<Popover>('actionsPop');
  private readonly cellDirectives = contentChildren(CellTemplateDirective);
  readonly rowActionsDirective = contentChild(RowActionsDirective);

  readonly searchTerm = signal('');
  /** الصف اللي القايمة ⋮ مفتوحة له */
  readonly activeRow = signal<T | null>(null);

  /** القيم اللي المستخدم بيكتبها (قبل التطبيق) */
  readonly draftFilters = signal<ColumnFilters>({});
  /** القيم المطبّقة فعلاً على الجدول */
  readonly appliedFilters = signal<ColumnFilters>({});

  readonly cellTemplates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const d of this.cellDirectives()) map.set(d.key(), d.template);
    return map;
  });

  readonly hasActions = computed(() => this.actions().length > 0 || !!this.rowActionsDirective());

  /** هل فيه أي عمود له فلتر؟ */
  readonly filtersOn = computed(
    () => this.columnFilters() && this.columns().some((c) => this.filterTypeOf(c) !== 'none'),
  );

  /** عمود الإجراءات بيظهر لو فيه actions أو فلاتر (عشان زرار تطبيق/مسح) */
  readonly showActionsCol = computed(() => this.hasActions() || this.filtersOn());

  readonly colspan = computed(
    () => this.columns().length + (this.showIndex() ? 1 : 0) + (this.showActionsCol() ? 1 : 0),
  );

  readonly filterFields = computed(() =>
    this.columns()
      .filter((c) => c.searchable ?? (!c.value && c.type !== 'status'))
      .map((c) => c.key),
  );

  /** الداتا بعد تطبيق فلاتر الأعمدة */
  readonly filteredValue = computed(() => {
    const data = this.value();
    if (!this.filtersOn()) return data;

    const active = this.columns()
      .map((col) => ({ col, type: this.filterTypeOf(col), val: this.appliedFilters()[col.key] }))
      .filter((f) => f.type !== 'none' && this.hasValue(f.val));

    if (active.length === 0) return data;
    return data.filter((row) => active.every((f) => this.matches(row, f.col, f.type, f.val)));
  });

  readonly hasDraft = computed(() => Object.values(this.draftFilters()).some((v) => this.hasValue(v)));
  readonly hasApplied = computed(() => Object.values(this.appliedFilters()).some((v) => this.hasValue(v)));

  // ===== البحث العام =====
  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.dt()?.filterGlobal(term, 'contains');
  }

  // ===== فلاتر الأعمدة =====
  filterTypeOf(col: TableColumn<T>): ColumnFilterType {
    if (col.filter) return col.filter;
    if (col.searchable === false) return 'none';
    switch (col.type) {
      case 'date':
      case 'datetime': return 'date';
      case 'status':
      case 'badge':    return 'select';
      default:         return 'text';
    }
  }

  filterOptionsOf(col: TableColumn<T>): FilterOption[] {
    if (col.filterOptions) return col.filterOptions;
    if (col.type === 'status') {
      return [
        { label: col.trueLabel ?? 'نشط', value: 'true' },
        { label: col.falseLabel ?? 'غير نشط', value: 'false' },
      ];
    }
    if (col.badges) {
      return Object.entries(col.badges).map(([value, b]) => ({ label: b.label, value }));
    }
    return [];
  }

  draftText(col: TableColumn<T>): string {
    const v = this.draftFilters()[col.key];
    return typeof v === 'string' ? v : '';
  }

  draftDates(col: TableColumn<T>): Date[] | null {
    const v = this.draftFilters()[col.key];
    return Array.isArray(v) ? v : null;
  }

  setDraft(key: string, value: ColumnFilterValue): void {
    this.draftFilters.update((f) => ({ ...f, [key]: value }));
  }

  applyFilters(): void {
    const next: ColumnFilters = {};
    for (const [k, v] of Object.entries(this.draftFilters())) {
      if (this.hasValue(v)) next[k] = v;
    }
    this.appliedFilters.set(next);
    this.goToFirstPage();
    this.filtersChange.emit(next);
  }

  clearFilters(): void {
    this.draftFilters.set({});
    this.appliedFilters.set({});
    this.goToFirstPage();
    this.filtersChange.emit({});
  }

  private goToFirstPage(): void {
    const t = this.dt();
    if (t) t.first = 0;
  }

  private hasValue(v: ColumnFilterValue): boolean {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0 && !!v[0];
    return String(v).trim() !== '';
  }

  private matches(row: T, col: TableColumn<T>, type: ColumnFilterType, val: ColumnFilterValue): boolean {
    const cell = this.resolve(row, col);

    if (type === 'date') {
      const range = val as Date[];
      const d = cell instanceof Date ? cell : new Date(cell as string);
      if (isNaN(d.getTime())) return false;
      const day = startOfDay(d);
      const from = startOfDay(range[0]);
      const to = range[1] ? startOfDay(range[1]) : from;
      return day >= from && day <= to;
    }

    if (type === 'select') {
      const normalized = col.type === 'status' ? String(!!cell) : String(cell);
      return normalized === String(val);
    }

    // text
    if (this.isEmpty(cell)) return false;
    return String(cell).toLowerCase().includes(String(val).trim().toLowerCase());
  }

  // ===== مساعدات العرض =====
  resolve(row: T, col: TableColumn<T>): unknown {
    if (col.value) return col.value(row);
    return col.key.split('.').reduce<any>((acc, k) => acc?.[k], row);
  }

  isEmpty(v: unknown): boolean {
    return v === null || v === undefined || v === '';
  }

  badgeFor(v: unknown, col: TableColumn<T>): BadgeStyle {
    const key = String(v);
    return col.badges?.[key] ?? { label: key, class: NEUTRAL_BADGE };
  }

  /** yyyy/MM/dd (+ الوقت لو النوع datetime) بأرقام حسب اللغة */
  formatDate(v: unknown, col: TableColumn<T>): string {
    const d = v instanceof Date ? v : new Date(v as string);
    if (isNaN(d.getTime())) return String(v);

    const loc = this.locale();
    const parts = new Intl.DateTimeFormat(loc, {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const part = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const date = `${part('year')}/${part('month')}/${part('day')}`;

    if (col.type !== 'datetime') return date;

    const time = new Intl.DateTimeFormat(loc, {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d);
    return `${date} ${loc.startsWith('ar') ? 'في' : '•'} ${time}`;
  }

  private alignClass(col: TableColumn<T>): string {
    switch (col.align) {
      case 'start': return 'text-start';
      case 'end':   return 'text-end';
      default:      return 'text-center';
    }
  }

  thClass(col: TableColumn<T>): string {
    return [this.alignClass(col), col.headerClass].filter(Boolean).join(' ');
  }

  tdClass(col: TableColumn<T>): string {
    return [this.alignClass(col), col.cellClass].filter(Boolean).join(' ');
  }

  // ===== الأزرار والقايمة =====
  actionClass(tone: ActionTone = 'neutral'): string {
    return TONE_CLASSES[tone];
  }

  menuItemClass(tone: ActionTone = 'neutral'): string {
    return MENU_TONE_CLASSES[tone];
  }

  isVisible(a: TableAction<T>, row: T): boolean {
    return a.visible ? a.visible(row) : true;
  }

  isDisabled(a: TableAction<T>, row: T): boolean {
    return a.disabled ? a.disabled(row) : false;
  }

  visibleActions(row: T): TableAction<T>[] {
    return this.actions().filter((a) => this.isVisible(a, row));
  }

  /** وضع buttons */
  onAction(event: Event, a: TableAction<T>, row: T): void {
    event.stopPropagation(); // عشان ما يتنفذش rowClick
    this.action.emit({ key: a.key, row });
  }

  /** وضع menu: فتح القايمة ⋮ */
  openMenu(event: Event, row: T): void {
    event.stopPropagation();
    this.activeRow.set(row);
    this.popover()?.toggle(event, event.currentTarget);
  }

  onMenuAction(a: TableAction<T>): void {
    const row = this.activeRow();
    this.popover()?.hide();
    if (row) this.action.emit({ key: a.key, row });
  }

  onRowClick(row: T): void {
    if (this.clickable()) this.rowClick.emit(row);
  }
}