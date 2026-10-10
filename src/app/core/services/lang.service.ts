import { Injectable, signal } from '@angular/core';

export type Lang = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  // حفظ اللغة الحالية باستخدام Signal مع الاحتفاظ باللغة المفضلة في localStorage
  readonly currentLang = signal<Lang>((localStorage.getItem('lang') as Lang) || 'ar');

  setLanguage(lang: Lang) {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang() === 'ar' ? 'en' : 'ar');
  }
}