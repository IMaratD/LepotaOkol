import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLang = 'ru';
  private translations: any = {};
  private translationsLoaded = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadLanguage(this.currentLang);
  }

  async loadLanguage(lang: string): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get(`/assets/i18n/${lang}.json`));
      this.translations = data;
      this.currentLang = lang;
      this.translationsLoaded.next(true);
    } catch (err) {
      console.error(`Ошибка загрузки перевода для языка ${lang}:`, err);
    }
  }

  get(key: string): string {
    return key.split('.').reduce((obj, part) => obj?.[part], this.translations) || key;
  }

  get currentLanguage() {
    return this.currentLang;
  }

  get isReady() {
    return this.translationsLoaded.asObservable();
  }
}

// import { Injectable, signal } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { firstValueFrom } from 'rxjs';

// @Injectable({ providedIn: 'root' })
// export class TranslationService {
//   private translations: Record<string, string> = {};
//   private currentLang = signal('ru');

//   constructor(private http: HttpClient) {
//     this.loadLanguage(this.currentLang());
//   }

//   get lang() {
//     return this.currentLang.asReadonly();
//   }

//   async loadLanguage(lang: string) {
//     try {
//       const data = await firstValueFrom(
//         this.http.get<Record<string, string>>(`assets/i18n/${lang}.json`)
//       );
//       this.translations = data || {};
//       this.currentLang.set(lang);
//     } catch (e) {
//       console.error(`Ошибка загрузки языка "${lang}":`, e);
//     }
//   }

//   t(key: string): string {
//     return this.translations[key] || key;
//   }
// }
