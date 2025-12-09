import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(key: string): string {
    return this.translationService.get(key);
  }
}

// import { Pipe, PipeTransform, inject, effect } from '@angular/core';
// import { TranslationService } from '../services/translation.service';

// @Pipe({
//   name: 'translate',
//   standalone: true,
//   pure: false, // чтобы обновлялось при смене языка
// })
// export class TranslatePipe implements PipeTransform {
//   private translationService = inject(TranslationService);
//   private lang = this.translationService.lang();

//   constructor() {
//     effect(() => {
//       this.lang = this.translationService.lang();
//     });
//   }

//   transform(key: string): string {
//     return this.translationService.t(key);
//   }
// }
