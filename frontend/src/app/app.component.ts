import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from './services/translation.service';
import { TranslatePipe } from './pipes/translate.pipe';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TranslatePipe, RouterLink, RouterLinkActive],

  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('dropdownAnimation', [
      state('void', style({ opacity: 0, transform: 'translateY(-10px)' })),
      transition(':enter', [
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' })),
      ]),
    ]),
  ],
})
export class AppComponent {
  title = 'Лепота Окол';
  showFontMenu = false;

  isMenuOpen = false;
  currentLang = 'ru';

  toggleLeftMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  isLangMenuOpen = false;
  toggleLangMenu() {
    this.isLangMenuOpen = !this.isLangMenuOpen;
  }
  switchLanguage(lang: string) {
    this.translate.use(lang);
    this.isLangMenuOpen = false;
    this.currentLang = lang;
  }

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['ru', 'tt', 'en']);
    this.translate.use('ru');
  }

  toggleMenu(type: 'ru' | 'tt') {
    this.showRusFontMenu = type === 'ru' ? !this.showRusFontMenu : false;
    this.showTatFontMenu = type === 'tt' ? !this.showTatFontMenu : false;
  }

  isFontMenuOpen = false;
  activeScript: 'ru' | 'tt' = 'ru';
  currentFont: string | null = null;

  toggleFontMenu() {
    this.isFontMenuOpen = !this.isFontMenuOpen;
  }

  selectScript(script: 'ru' | 'tt') {
    this.activeScript = script;
    this.currentFont = null;
  }

  fontStyles: { ru: { id: string; name: string }[]; tt: { id: string; name: string }[] } = {
    ru: [
      { id: 'ustav', name: 'Устав' },
      { id: 'poluustav', name: 'Полуустав' },
      { id: 'skoropis', name: 'Скоропись' },
      { id: 'modern', name: 'Современный' },
    ],
    tt: [
      { id: 'orkhon', name: 'Орхон' },
      { id: 'arabic', name: 'Арабская' },
      { id: 'latin', name: 'Латиница' },
      { id: 'modern', name: 'Современный' },
    ],
  };

  showRusFontMenu = false;
  showTatFontMenu = false;

  tooltips = [
    {
      class: 'sun',
      img: 'assets/icons/sun.svg',
      alt: 'Солнце',
      text: '<b>☀️<i>Россия</b> – это множество действительно великих народов, переплетённых одной общей историей и живущих в единстве, несмотря ни на что!</i><br><br><b>❤️ Разные культуры – одно сердце!</b>',
    },
    {
      class: 'ru',
      img: 'assets/icons/ru.svg',
      alt: 'Флаг России',
      text: '<b><i>ФЛАГ РОССИИ</b> <br> <br> <b>Белый</b> – символизирует благородство, чистоту и откровенность,<br> <br> <b>Синий</b> – олицетворяет верность, честность, постоянство и целомудрие,<br> <br> <b>Красный</b> – означает мужество, силу, энергию и кровь, пролитую за Родину.</i>',
    },
    {
      class: 'tat',
      img: 'assets/icons/tat.svg',
      alt: 'Флаг Татарстана',
      text: '<b><i>ФЛАГ ТАТАРСТАНА</b> <br> <br>  <b>Зелёный</b> – символизирует жизнь, природу, весну, возрождение и исламскую традицию,<br> <br> <b>Белый</b> – означает чистоту, благородство, мир и гармонию,<br> <br> <b>Красный</b> – олицетворяет мужество, силу, энергию и историческое наследие.</i>',
    },
  ];

  availableFontStyles: { id: string; name: string }[] = [];

  changeFontStyle(style: string) {
    console.log(`Смена шрифта на: ${style}`);

    this.currentFont = style;

    const fontMap: Record<string, string> = {
      ustav: 'PonomarUnicode, serif',
      poluustav: 'TriodionUnicode, serif',
      skoropis: 'Voskresensky-Regular, serif',
      modern: 'TimesNewRoman, serif',
      orkhon: 'OrkhonInk, serif',
      arabic: 'Amiri, serif',
      latin: 'Montserrat, sans-serif',
    };

    if (fontMap[style]) {
      document.documentElement.style.setProperty('--font-family', fontMap[style]);
      console.log(
        `Текущий стиль:`,
        getComputedStyle(document.documentElement).getPropertyValue('--font-family')
      );
    } else {
      console.warn(`Стиль ${style} не найден!`);
    }
  }
}
