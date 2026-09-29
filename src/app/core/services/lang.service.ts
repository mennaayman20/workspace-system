import { Injectable, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'user_language';
  private translate = inject(TranslateService);

  // استخدام Signal للغة الحالية لتوافق أسرع وأداء عالي مع Angular 19
  public currentLang = signal<'ar' | 'en'>('ar');

  initLanguage() {
    this.translate.addLangs(['ar', 'en']);
    const savedLang = (localStorage.getItem(this.LANG_KEY) as 'ar' | 'en') || 'ar';
    this.setLanguage(savedLang);
  }

  setLanguage(lang: 'ar' | 'en') {
    this.currentLang.set(lang);
    this.translate.use(lang);
    localStorage.setItem(this.LANG_KEY, lang);
    
    // تحديث اتجاه الصفحة والمستند فورياً (RTL / LTR)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  toggleLanguage() {
    const nextLang = this.currentLang() === 'ar' ? 'en' : 'ar';
    this.setLanguage(nextLang);
  }
}