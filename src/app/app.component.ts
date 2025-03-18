import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, NgStyle } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NgStyle, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('dropdownAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class AppComponent {
  title = 'Лепота Окол';
  showFontMenu = false;
  currentLanguage: 'ru' | 'tt' = 'ru';

  fontStyles: { ru: { id: string; name: string }[]; tt: { id: string; name: string }[] } = {
    ru: [
      { id: 'ustav', name: 'Устав' },
      { id: 'poluustav', name: 'Полуустав' },
      { id: 'skoropis', name: 'Скоропись' },
      { id: 'modern', name: 'Современный' }
    ],
    tt: [
      { id: 'orkhon', name: 'Орхон' },
      { id: 'arabic', name: 'Арабская' },
      { id: 'latin', name: 'Латиница' },
      { id: 'modern', name: 'Современный' }
    ]
  };

  showRusFontMenu = false;
showTatFontMenu = false;

tooltips = [
  {
    class: 'sun',
    img: 'assets/sun.svg',
    alt: 'Солнце',
    text: '☀️ <i><b>Россия</b> – это множество действительно великих народов, переплетённых одной общей историей и живущих в единстве, несмотря ни на что!</i><br><br>❤️ Разные культуры – одно сердце!'
  },
  {
    class: 'ru',
    img: 'assets/ru.svg',
    alt: 'Флаг России',
    text: '<b>ФЛАГ РОССИИ</b> <br> <b>Белый</b> – символизирует благородство, чистоту и откровенность,<br> <b>Синий</b> – олицетворяет верность, честность, постоянство и целомудрие,<br> <b>Красный</b> – означает мужество, силу, энергию и кровь, пролитую за Родину.<br> <br>❤️ Разные культуры – одно сердце!'
  },
  {
    class: 'tat',
    img: 'assets/tat.svg',
    alt: 'Флаг Татарстана',
    text: '<b>ФЛАГ ТАТАРСТАНА</b> <br>  <b>Зелёный</b> – символизирует жизнь, природу, весну, возрождение и исламскую традицию,<br> <b>Белый</b> – означает чистоту, благородство, мир и гармонию,<br> <b>Красный</b> – олицетворяет мужество, силу, энергию и историческое наследие.<br><br>❤️ Разные культуры – одно сердце!'
  }
];

toggleRusFontMenu() {
  this.showRusFontMenu = !this.showRusFontMenu;
  this.showTatFontMenu = false; // Закрываем второе меню
}

toggleTatFontMenu() {
  this.showTatFontMenu = !this.showTatFontMenu;
  this.showRusFontMenu = false;
}

  availableFontStyles: { id: string; name: string }[] = [];

  constructor() {
    this.setLanguage(this.currentLanguage);
  }

  setLanguage(lang: 'ru' | 'tt') {
    this.currentLanguage = lang;
    this.availableFontStyles = [...this.fontStyles[lang]];
    console.log(`Язык изменен на: ${this.currentLanguage}`);
  }

  toggleFontMenu() {
    this.showFontMenu = !this.showFontMenu;
  }

  changeFontStyle(style: string) {
    console.log(`Смена шрифта на: ${style}`);

    const fontMap: Record<string, string> = {
      ustav: 'PonomarUnicode, serif',
      poluustav: 'TriodionUnicode, serif',
      skoropis: 'Voskresensky-Regular, serif',
      modern: 'TimesNewRoman, serif',
      orkhon: 'OrkhonInk, serif',
      arabic: 'Amiri, serif',
      latin: 'Montserrat, sans-serif'
    };

    if (fontMap[style]) {
      document.documentElement.style.setProperty('--font-family', fontMap[style]);
      console.log(`Текущий стиль:`, getComputedStyle(document.documentElement).getPropertyValue('--font-family'));
    } else {
      console.warn(`Стиль ${style} не найден!`);
    }

    this.showFontMenu = false;
  }
}
