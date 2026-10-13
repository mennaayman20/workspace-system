
import { Injectable, signal, inject, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly currentLang = signal<Lang>(this.getSavedLang());
  readonly isRtl = computed(() => this.currentLang() === 'ar');

  constructor() {
    this.translate.addLangs(['ar', 'en']);
    this.apply(this.currentLang());
  }

  setLanguage(lang: Lang): void {
    this.apply(lang);
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'ar' ? 'en' : 'ar');
  }

  t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private apply(lang: Lang): void {
    this.translate.use(lang).subscribe({
      next: () => {
        this.currentLang.set(lang);
        localStorage.setItem('lang', lang);

        document.documentElement.lang = lang;
        document.documentElement.dir =
          lang === 'ar' ? 'rtl' : 'ltr';
      },
      error: (err) => {
        console.error(`Failed to load ${lang}.json`, err);
      },
    });
  }

  private getSavedLang(): Lang {
    const saved = localStorage.getItem('lang');
    return saved === 'en' || saved === 'ar' ? saved : 'ar';
  }
}
