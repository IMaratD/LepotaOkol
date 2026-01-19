import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-about',
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent {
  showFontMenu = false;

  selectedFont: string = 'times-new-roman';

  toggleFontMenu() {
    this.showFontMenu = !this.showFontMenu;
  }
  fonts = [
    { name: 'Устав', class: 'ponomar-unicode' },
    { name: 'Полуустав', class: 'triodion-unicode' },
    { name: 'Скоропись', class: 'voskresensky-regular' },
    { name: 'Современный шрифт', class: 'times-new-roman' },
  ];

  setFont(fontClass: string): void {
    this.selectedFont = fontClass;
    localStorage.setItem('selectedFont', fontClass);
    document.body.className = fontClass;
  }

  ngOnInit(): void {
    const savedFont = localStorage.getItem('selectedFont');
    if (savedFont) {
      this.selectedFont = savedFont;
      document.body.className = savedFont;
    }
  }
}
