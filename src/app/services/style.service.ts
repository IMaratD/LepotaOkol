import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' // Это делает сервис доступным во всем приложении
})
export class StyleService {
  private currentStyle: string = 'modern';

  getStyle(): string {
    return this.currentStyle;
  }

  setStyle(style: string): void {
    this.currentStyle = style;
  }
}
