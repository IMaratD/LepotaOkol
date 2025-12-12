import {
  Component,
  AfterViewInit,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type Tool = 'pen' | 'marker' | 'brush' | 'shadow' | 'spray';

interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
}

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './photos.component.html',
  styleUrls: ['./photos.component.scss'],
})
export class PhotosComponent implements AfterViewInit, OnInit {
  photos: string[] = [];
  previewPhoto: string | null = null;
  selectedPhoto: string | null = null;

  private backendBase = 'http://localhost:5012';

  @ViewChild('backgroundCanvas', { static: false })
  backgroundCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('drawingCanvas', { static: false })
  drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas', { static: false })
  previewCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hiddenImage', { static: false })
  hiddenImage!: ElementRef<HTMLImageElement>;

  bgCtx!: CanvasRenderingContext2D;
  drawCtx!: CanvasRenderingContext2D;
  previewCtx!: CanvasRenderingContext2D;

  currentTool: Tool = 'pen';
  currentColor = '#ff2d55';
  currentSize = 4;
  currentOpacity = 1;

  isDrawing = false;
  currentStroke: Stroke | null = null;

  history: Stroke[] = [];
  redoStack: Stroke[] = [];

  dpr = window.devicePixelRatio || 1;

  private displayW = 0;
  private displayH = 0;
  private origW = 0;
  private origH = 0;

  constructor(private host: ElementRef, private http: HttpClient) {}

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.selectedPhoto) return;
    this.setupCanvases();
    this.renderBackgroundImage();
    this.renderAll();
  }

  ngOnInit(): void {
    this.loadPhotos();
  }

  ngAfterViewInit(): void {}

  loadPhotos() {
    const url = `${this.backendBase}/api/file/list`;
    this.http.get<string[]>(url).subscribe({
      next: (data) => {
        this.photos = data.map((p) => (p.startsWith('http') ? p : `${this.backendBase}${p}`));
      },
      error: (err) => console.error('Ошибка загрузки файлов:', err),
    });
  }

  openPreview(photo: string) {
    this.previewPhoto = photo;
  }

  closePreview() {
    this.previewPhoto = null;
  }

  get currentIndex(): number {
    return this.previewPhoto ? this.photos.indexOf(this.previewPhoto) : -1;
  }

  nextPhoto(): void {
    const i = this.currentIndex;
    if (i >= 0 && i < this.photos.length - 1) this.previewPhoto = this.photos[i + 1];
  }

  prevPhoto(): void {
    const i = this.currentIndex;
    if (i > 0) this.previewPhoto = this.photos[i - 1];
  }

  async openEditor(photo: string) {
    this.selectedPhoto = photo;
    await new Promise((r) => setTimeout(r, 0));

    if (this.hiddenImage?.nativeElement) {
      this.hiddenImage.nativeElement.src = photo;
    } else {
      console.error('hiddenImage element not found');
    }

    await this.waitForImageLoad();

    const img = this.hiddenImage.nativeElement;
    this.origW = img.naturalWidth || 0;
    this.origH = img.naturalHeight || 0;

    this.setupCanvases();
    this.renderBackgroundImage();
    this.renderAll();

    const c = this.drawingCanvas.nativeElement;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointercancel', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerUp);
  }

  closeEditor() {
    try {
      const c = this.drawingCanvas.nativeElement;
      c.removeEventListener('pointerdown', this.onPointerDown);
      c.removeEventListener('pointermove', this.onPointerMove);
      c.removeEventListener('pointerup', this.onPointerUp);
      c.removeEventListener('pointercancel', this.onPointerUp);
      c.removeEventListener('pointerleave', this.onPointerUp);
    } catch {}

    this.selectedPhoto = null;
    this.history = [];
    this.redoStack = [];
  }

  private waitForImageLoad(): Promise<void> {
    return new Promise((res) => {
      const img = this.hiddenImage.nativeElement;
      if (!img) return res();
      if (img.complete && img.naturalWidth > 0) return res();
      img.onload = () => res();
      img.onerror = () => {
        console.warn('Ошибка загрузки изображения (onerror) — возможно CORS или путь неверен');
        res();
      };
    });
  }

  private setupCanvases() {
    const img = this.hiddenImage.nativeElement;
    const w = img.naturalWidth || 1;
    const h = img.naturalHeight || 1;

    const parent = this.backgroundCanvas.nativeElement.parentElement as HTMLElement | null;
    const availW = parent ? parent.clientWidth : Math.floor(window.innerWidth * 0.9);
    const availH = parent ? parent.clientHeight : Math.floor(window.innerHeight * 0.9);

    let displayW = Math.max(1, Math.round(availW));
    let displayH = Math.max(1, Math.round((h / w) * displayW));
    if (displayH > availH) {
      displayH = availH;
      displayW = Math.max(1, Math.round((w / h) * displayH));
    }

    const oldDisplayW = this.displayW || displayW;
    const oldDisplayH = this.displayH || displayH;
    this.displayW = displayW;
    this.displayH = displayH;

    const canvases = [
      this.backgroundCanvas.nativeElement,
      this.drawingCanvas.nativeElement,
      this.previewCanvas.nativeElement,
    ];

    canvases.forEach((c) => {
      c.style.width = `${this.displayW}px`;
      c.style.height = `${this.displayH}px`;
      c.width = Math.round(this.displayW * this.dpr);
      c.height = Math.round(this.displayH * this.dpr);
      c.style.position = 'absolute';
      c.style.top = '0';
      c.style.left = '0';
      c.style.touchAction = 'none';
      c.style.pointerEvents = 'auto';
    });

    this.backgroundCanvas.nativeElement.style.zIndex = '10';
    this.previewCanvas.nativeElement.style.zIndex = '11';
    this.drawingCanvas.nativeElement.style.zIndex = '12';
    this.previewCanvas.nativeElement.style.pointerEvents = 'none';

    this.bgCtx = this.backgroundCanvas.nativeElement.getContext('2d')!;
    this.drawCtx = this.drawingCanvas.nativeElement.getContext('2d')!;
    this.previewCtx = this.previewCanvas.nativeElement.getContext('2d')!;

    [this.bgCtx, this.drawCtx, this.previewCtx].forEach((ctx) => {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    });

    if (this.history?.length && (oldDisplayW !== this.displayW || oldDisplayH !== this.displayH)) {
      const sx = this.displayW / oldDisplayW;
      const sy = this.displayH / oldDisplayH;
      for (const s of this.history) {
        for (const p of s.points) {
          p.x = p.x * sx;
          p.y = p.y * sy;
        }
      }
    }

    this.bgCtx.clearRect(0, 0, this.displayW, this.displayH);
    this.drawCtx.clearRect(0, 0, this.displayW, this.displayH);
    this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
  }

  private renderBackgroundImage() {
    const img = this.hiddenImage.nativeElement;
    if (!this.bgCtx) return;
    this.bgCtx.clearRect(0, 0, this.displayW, this.displayH);
    try {
      this.bgCtx.drawImage(img, 0, 0, this.displayW, this.displayH);
    } catch (e) {
      console.error('Ошибка drawImage — возможно CORS', e);
    }
  }

  onPointerDown = (ev: PointerEvent) => {
    ev.preventDefault();
    try {
      (ev.target as Element).setPointerCapture(ev.pointerId);
    } catch {}
    this.isDrawing = true;
    this.currentStroke = {
      tool: this.currentTool,
      color: this.currentColor,
      size: this.currentSize,
      opacity: this.currentOpacity,
      points: [],
    };
    this.redoStack = [];
    this.addPointFromPointer(ev);
    this.renderPreview();
  };

  onPointerMove = (ev: PointerEvent) => {
    if (!this.isDrawing || !this.currentStroke) return;
    this.addPointFromPointer(ev);
    this.renderPreview();
  };

  onPointerUp = (ev: PointerEvent) => {
    if (!this.isDrawing || !this.currentStroke) return;
    this.addPointFromPointer(ev);
    this.history.push(this.currentStroke);
    this.currentStroke = null;
    this.isDrawing = false;
    this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
    this.renderAll();
  };

  private addPointFromPointer(ev: PointerEvent) {
    const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();
    let x = ev.clientX - rect.left;
    let y = ev.clientY - rect.top;
    x = Math.max(0, Math.min(this.displayW, x));
    y = Math.max(0, Math.min(this.displayH, y));
    const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 1;
    this.currentStroke?.points.push({ x, y, pressure });
  }

  private renderPreview() {
    if (!this.previewCtx) return;
    this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
    if (!this.currentStroke) return;
    this.drawStrokeToContext(this.previewCtx, this.currentStroke, 1, true);
  }

  private renderAll() {
    if (!this.drawCtx) return;
    this.drawCtx.clearRect(0, 0, this.displayW, this.displayH);
    for (const s of this.history) {
      this.drawStrokeToContext(this.drawCtx, s, 1, false);
    }
  }

  async saveAs(format: 'png' | 'jpg' | 'webp' = 'png'): Promise<void> {
    try {
      const blob = await this.createExportBlob(format);

      if ((window as any).showSaveFilePicker) {
        try {
          const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[format];
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `drawing-${Date.now()}.${format}`,
            types: [{ description: 'Image file', accept: { [mime]: ['.' + format] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('Ошибка saveFilePicker, fallback через <a>', err);
        }
      }

      this.saveBlobViaAnchor(blob, format);
    } catch (err) {
      console.error('Ошибка при сохранении изображения:', err);
    }
  }

  private async createExportBlob(format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.origW || this.displayW;
    exportCanvas.height = this.origH || this.displayH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) throw new Error('Не удалось получить 2D контекст');

    try {
      ctx.drawImage(this.hiddenImage.nativeElement, 0, 0, exportCanvas.width, exportCanvas.height);
    } catch (e) {
      console.error('Ошибка drawImage — проверь CORS', e);
    }

    const scaleX = exportCanvas.width / this.displayW;
    const scaleY = exportCanvas.height / this.displayH;
    const scale = (scaleX + scaleY) / 2;

    for (const s of this.history) this.drawStrokeToContext(ctx, s, scale, false);
    if (this.currentStroke) this.drawStrokeToContext(ctx, this.currentStroke, scale, false);

    const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[format];

    return new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob(
        (b) => {
          if (!b) reject(new Error('Не удалось создать blob'));
          else resolve(b);
        },
        mime,
        0.92
      );
    });
  }

  private saveBlobViaAnchor(blob: Blob, format: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing-${Date.now()}.${format}`;
    if (document.body) {
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      console.warn('document.body отсутствует — fallback не сработал');
    }
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private drawStrokeToContext(
    ctx: CanvasRenderingContext2D,
    s: Stroke,
    pointScale = 1,
    isPreview = false
  ) {
    if (!ctx || !s.points.length) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = s.opacity;
    ctx.strokeStyle = s.color;
    const baseWidth = Math.max(1, s.size * pointScale);

    switch (s.tool) {
      case 'pen':
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = baseWidth;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * pointScale;
          const y = p.y * pointScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        break;

      case 'marker':
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = baseWidth * 2.5;
        ctx.globalAlpha = Math.max(0.12, s.opacity * 0.6);
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * pointScale;
          const y = p.y * pointScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        break;

      case 'brush':
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = baseWidth * 1.8;
        ctx.shadowBlur = Math.max(0, baseWidth / 2);
        ctx.shadowColor = s.color;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * pointScale;
          const y = p.y * pointScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;

      case 'shadow':
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineWidth = baseWidth * 1.6;
        ctx.shadowBlur = Math.max(4, baseWidth);
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * pointScale;
          const y = p.y * pointScale + Math.max(1, baseWidth * 0.4);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;

      case 'spray':
        ctx.globalCompositeOperation = 'source-over';
        const density = Math.max(10, Math.round(baseWidth * 2.5));
        for (let i = 1; i < s.points.length; i++) {
          const p0 = s.points[i - 1];
          const p1 = s.points[i];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const segLen = Math.hypot(dx, dy) || 1;
          const steps = Math.max(1, Math.round(segLen / 2));
          for (let step = 0; step < steps; step++) {
            const t = step / steps;
            const cx = p0.x + dx * t;
            const cy = p0.y + dy * t;
            for (let k = 0; k < density; k++) {
              const r = Math.random() * baseWidth * 0.6;
              const ang = Math.random() * Math.PI * 2;
              const sx = (cx + Math.cos(ang) * r) * pointScale;
              const sy = (cy + Math.sin(ang) * r) * pointScale;
              ctx.fillStyle = s.color;
              ctx.fillRect(sx, sy, 1, 1);
            }
          }
        }
        break;

      default:
        ctx.lineWidth = baseWidth;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * pointScale;
          const y = p.y * pointScale;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  undo() {
    if (!this.history.length) return;
    const s = this.history.pop()!;
    this.redoStack.push(s);
    this.renderAll();
  }

  redo() {
    if (!this.redoStack.length) return;
    const s = this.redoStack.pop()!;
    this.history.push(s);
    this.renderAll();
  }
}

// import {
//   Component,
//   AfterViewInit,
//   OnInit,
//   ElementRef,
//   ViewChild,
//   HostListener,
// } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { HttpClient } from '@angular/common/http';
// import { Subject } from 'rxjs/internal/Subject';

// type Tool = 'pen' | 'marker' | 'brush' | 'shadow' | 'spray';

// interface StrokePoint {
//   x: number;
//   y: number;
//   pressure?: number;
// }

// interface Stroke {
//   tool: Tool;
//   color: string;
//   size: number;
//   opacity: number;
//   points: StrokePoint[];
// }

// @Component({
//   selector: 'app-photos',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './photos.component.html',
//   styleUrls: ['./photos.component.scss'],
// })
// export class PhotosComponent implements AfterViewInit, OnInit {
//   photos: string[] = [];
//   previewPhoto: string | null = null;
//   selectedPhoto: string | null = null;

//   private backendBase = 'http://localhost:5012';

//   private fileSaveSubject = new Subject<{ blob: Blob; format: string }>();

//   @ViewChild('backgroundCanvas', { static: false })
//   backgroundCanvas!: ElementRef<HTMLCanvasElement>;
//   @ViewChild('drawingCanvas', { static: false })
//   drawingCanvas!: ElementRef<HTMLCanvasElement>;
//   @ViewChild('previewCanvas', { static: false })
//   previewCanvas!: ElementRef<HTMLCanvasElement>;
//   @ViewChild('hiddenImage', { static: false })
//   hiddenImage!: ElementRef<HTMLImageElement>;

//   bgCtx!: CanvasRenderingContext2D;
//   drawCtx!: CanvasRenderingContext2D;
//   previewCtx!: CanvasRenderingContext2D;

//   currentTool: Tool = 'pen';
//   currentColor = '#ff2d55';
//   currentSize = 4;
//   currentOpacity = 1;

//   isDrawing = false;
//   currentStroke: Stroke | null = null;

//   history: Stroke[] = [];
//   redoStack: Stroke[] = [];

//   dpr = window.devicePixelRatio || 1;

//   // display size in CSS pixels (вписанные размеры)
//   private displayW = 0;
//   private displayH = 0;

//   // оригинальные размеры изображения (для экспорта)
//   private origW = 0;
//   private origH = 0;

//   constructor(private host: ElementRef, private http: HttpClient) {}

//   @HostListener('window:resize')
//   onWindowResize() {
//     if (!this.selectedPhoto) return;
//     this.setupCanvases();
//     this.renderBackgroundImage();
//     this.renderAll();
//   }

//   ngOnInit(): void {
//     this.loadPhotos();

//     this.fileSaveSubject.subscribe(({ blob, format }) => {
//       const ext = format;
//       const mime = {
//         png: 'image/png',
//         jpg: 'image/jpeg',
//         webp: 'image/webp',
//       }[format];

//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `drawing-${Date.now()}.${ext}`;

//       // <=== ЗДЕСЬ ГЛАВНОЕ ИСПРАВЛЕНИЕ
//       const root = document.body || document.documentElement;

//       root.appendChild(a);
//       a.click();
//       a.remove();
//       URL.revokeObjectURL(url);
//     });

//     this.fileSaveSubject.subscribe(({ blob, format }) => {
//       const ext = format;
//       const mime = {
//         png: 'image/png',
//         jpg: 'image/jpeg',
//         webp: 'image/webp',
//       }[format];

//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `drawing-${Date.now()}.${ext}`;
//       const root = document.body || document.documentElement;
//       root.appendChild(a);
//       a.click();
//       a.remove();
//       URL.revokeObjectURL(url);
//     });
//   }

//   ngAfterViewInit(): void {}

//   loadPhotos() {
//     const url = `${this.backendBase}/api/file/list`;
//     this.http.get<string[]>(url).subscribe({
//       next: (data) => {
//         this.photos = data.map((p) => (p.startsWith('http') ? p : `${this.backendBase}${p}`));
//       },
//       error: (err) => console.error('Ошибка загрузки файлов:', err),
//     });
//   }

//   openPreview(photo: string) {
//     this.previewPhoto = photo;
//   }

//   closePreview() {
//     this.previewPhoto = null;
//   }

//   get currentIndex(): number {
//     return this.previewPhoto ? this.photos.indexOf(this.previewPhoto) : -1;
//   }

//   nextPhoto(): void {
//     const i = this.currentIndex;
//     if (i >= 0 && i < this.photos.length - 1) this.previewPhoto = this.photos[i + 1];
//   }

//   prevPhoto(): void {
//     const i = this.currentIndex;
//     if (i > 0) this.previewPhoto = this.photos[i - 1];
//   }

//   async openEditor(photo: string) {
//     this.selectedPhoto = photo;

//     await new Promise((r) => setTimeout(r, 0));

//     if (this.hiddenImage?.nativeElement) {
//       this.hiddenImage.nativeElement.src = photo;
//     } else {
//       console.error('hiddenImage element not found');
//     }

//     await this.waitForImageLoad();

//     const img = this.hiddenImage.nativeElement;
//     this.origW = img.naturalWidth || 0;
//     this.origH = img.naturalHeight || 0;

//     this.setupCanvases();
//     console.log('drawCtx', this.drawCtx);

//     this.renderBackgroundImage();
//     this.renderAll();

//     const c = this.drawingCanvas.nativeElement;

//     c.addEventListener('pointerdown', this.onPointerDown);
//     c.addEventListener('pointermove', this.onPointerMove);
//     c.addEventListener('pointerup', this.onPointerUp);
//     c.addEventListener('pointercancel', this.onPointerUp);
//     c.addEventListener('pointerleave', this.onPointerUp);
//   }

//   closeEditor() {
//     try {
//       const c = this.drawingCanvas.nativeElement;
//       c.removeEventListener('pointerdown', this.onPointerDown);
//       c.removeEventListener('pointermove', this.onPointerMove);
//       c.removeEventListener('pointerup', this.onPointerUp);
//       c.removeEventListener('pointercancel', this.onPointerUp);
//       c.removeEventListener('pointerleave', this.onPointerUp);
//     } catch (e) {}

//     this.selectedPhoto = null;
//     this.history = [];
//     this.redoStack = [];
//   }

//   private waitForImageLoad(): Promise<void> {
//     return new Promise((res) => {
//       const img = this.hiddenImage.nativeElement;
//       if (!img) return res();
//       if (img.complete && img.naturalWidth > 0) return res();
//       img.onload = () => res();
//       img.onerror = () => {
//         console.warn('Ошибка загрузки изображения (onerror) — возможно CORS или путь неверен');
//         res();
//       };
//     });
//   }

//   private setupCanvases() {
//     const img = this.hiddenImage.nativeElement;
//     const w = img.naturalWidth || 1;
//     const h = img.naturalHeight || 1;

//     // Родитель, который задаёт доступное пространство для canvas (это .canvas-box)
//     const parent = this.backgroundCanvas.nativeElement.parentElement as HTMLElement | null;

//     // Доступное пространство в CSS-пикселях
//     const availW = parent ? parent.clientWidth : Math.floor(window.innerWidth * 0.9);
//     const availH = parent ? parent.clientHeight : Math.floor(window.innerHeight * 0.9);

//     let displayW = Math.max(1, Math.round(availW));
//     let displayH = Math.max(1, Math.round((h / w) * displayW));

//     if (displayH > availH) {
//       displayH = availH;
//       displayW = Math.max(1, Math.round((w / h) * displayH));
//     }

//     const oldDisplayW = this.displayW || displayW;
//     const oldDisplayH = this.displayH || displayH;

//     this.displayW = displayW;
//     this.displayH = displayH;

//     const canvases = [
//       this.backgroundCanvas.nativeElement,
//       this.drawingCanvas.nativeElement,
//       this.previewCanvas.nativeElement,
//     ];

//     canvases.forEach((c) => {
//       c.style.width = `${this.displayW}px`;
//       c.style.height = `${this.displayH}px`;

//       c.width = Math.round(this.displayW * this.dpr);
//       c.height = Math.round(this.displayH * this.dpr);

//       // общие стили
//       c.style.position = 'absolute';
//       c.style.top = '0';
//       c.style.left = '0';
//       c.style.touchAction = 'none';
//       c.style.pointerEvents = 'auto';
//     });

//     this.backgroundCanvas.nativeElement.style.zIndex = '10';
//     this.previewCanvas.nativeElement.style.zIndex = '11';
//     this.drawingCanvas.nativeElement.style.zIndex = '12';
//     this.previewCanvas.nativeElement.style.pointerEvents = 'none';

//     this.bgCtx = this.backgroundCanvas.nativeElement.getContext('2d')!;
//     this.drawCtx = this.drawingCanvas.nativeElement.getContext('2d')!;
//     this.previewCtx = this.previewCanvas.nativeElement.getContext('2d')!;

//     [this.bgCtx, this.drawCtx, this.previewCtx].forEach((ctx) => {
//       ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
//       ctx.imageSmoothingEnabled = true;
//     });

//     if (
//       this.history &&
//       this.history.length &&
//       (oldDisplayW !== this.displayW || oldDisplayH !== this.displayH)
//     ) {
//       const sx = this.displayW / oldDisplayW;
//       const sy = this.displayH / oldDisplayH;
//       for (const s of this.history) {
//         for (const p of s.points) {
//           p.x = p.x * sx;
//           p.y = p.y * sy;
//         }
//       }
//     }

//     // Очистка (в CSS-пикселях)
//     this.bgCtx.clearRect(0, 0, this.displayW, this.displayH);
//     this.drawCtx.clearRect(0, 0, this.displayW, this.displayH);
//     this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);

//     console.debug('Canvases set up:', {
//       displayW: this.displayW,
//       displayH: this.displayH,
//       dpr: this.dpr,
//       parentW: parent?.clientWidth,
//       parentH: parent?.clientHeight,
//       origW: w,
//       origH: h,
//     });
//   }

//   private renderBackgroundImage() {
//     const img = this.hiddenImage.nativeElement;
//     if (!this.bgCtx) return;

//     this.bgCtx.clearRect(0, 0, this.displayW, this.displayH);
//     try {
//       // drawImage в CSS-пикселях (ctx трансформирован)
//       this.bgCtx.drawImage(img, 0, 0, this.displayW, this.displayH);
//     } catch (e) {
//       console.error(
//         'Ошибка drawImage — возможно CORS (проверь Access-Control-Allow-Origin на сервере):',
//         e
//       );
//     }
//   }

//   onPointerDown = (ev: PointerEvent) => {
//     ev.preventDefault();
//     try {
//       (ev.target as Element).setPointerCapture(ev.pointerId);
//     } catch {}
//     this.isDrawing = true;
//     this.currentStroke = {
//       tool: this.currentTool,
//       color: this.currentColor,
//       size: this.currentSize,
//       opacity: this.currentOpacity,
//       points: [],
//     };
//     this.redoStack = [];
//     this.addPointFromPointer(ev);
//     this.renderPreview();
//   };

//   onPointerMove = (ev: PointerEvent) => {
//     if (!this.isDrawing || !this.currentStroke) return;
//     this.addPointFromPointer(ev);
//     this.renderPreview();
//   };

//   onPointerUp = (ev: PointerEvent) => {
//     if (!this.isDrawing || !this.currentStroke) return;
//     this.addPointFromPointer(ev);
//     this.history.push(this.currentStroke);
//     this.currentStroke = null;
//     this.isDrawing = false;
//     this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
//     this.renderAll();
//   };

//   private addPointFromPointer(ev: PointerEvent) {
//     const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();

//     let x = ev.clientX - rect.left;
//     let y = ev.clientY - rect.top;

//     x = Math.max(0, Math.min(this.displayW, x));
//     y = Math.max(0, Math.min(this.displayH, y));
//     const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 1;

//     this.currentStroke?.points.push({ x, y, pressure });
//   }

//   private renderPreview() {
//     if (!this.previewCtx) return;
//     this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
//     if (!this.currentStroke) return;
//     this.drawStrokeToContext(this.previewCtx, this.currentStroke, 1, true);
//   }

//   private renderAll() {
//     if (!this.drawCtx) return;
//     this.drawCtx.clearRect(0, 0, this.displayW, this.displayH);
//     for (const s of this.history) {
//       this.drawStrokeToContext(this.drawCtx, s, 1, false);
//     }
//   }

//   // ------------------ МЕТОД Сохранения ------------------
//   async saveAs(format: 'png' | 'jpg' | 'webp' = 'png'): Promise<void> {
//     console.log('FORMAT:', format);

//     try {
//       // 1) создаём Blob с экспортным изображением
//       const blob = await this.createExportBlob(format);

//       // 2) пытаемся сохранить через showSaveFilePicker
//       if ((window as any).showSaveFilePicker) {
//         try {
//           const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[format];
//           const handle = await (window as any).showSaveFilePicker({
//             suggestedName: `drawing-${Date.now()}.${format}`,
//             types: [{ description: 'Image file', accept: { [mime]: ['.' + format] } }],
//           });
//           const writable = await handle.createWritable();
//           await writable.write(blob);
//           await writable.close();
//           return; // успешно
//         } catch (err: any) {
//           // если пользователь нажал "Отменить", просто выходим
//           if (err.name === 'AbortError') {
//             console.log('Пользователь отменил сохранение через picker');
//             return;
//           }
//           // любая другая ошибка — fallback
//           console.warn('Ошибка при saveFilePicker, используем fallback', err);
//           this.saveBlobViaAnchor(blob, format);
//           return;
//         }
//       }

//       // 3) fallback через <a> если picker недоступен
//       this.saveBlobViaAnchor(blob, format);
//     } catch (err) {
//       console.error('Ошибка при создании или сохранении изображения:', err);
//     }
//   }

//   // ------------------ Вспомогательный метод: создание Blob ------------------
//   private async createExportBlob(format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
//     const exportCanvas = document.createElement('canvas');
//     exportCanvas.width = this.origW || this.displayW;
//     exportCanvas.height = this.origH || this.displayH;
//     const ctx = exportCanvas.getContext('2d');
//     if (!ctx) throw new Error('Не удалось получить 2D контекст');

//     // рисуем исходное изображение
//     try {
//       ctx.drawImage(this.hiddenImage.nativeElement, 0, 0, exportCanvas.width, exportCanvas.height);
//     } catch (e) {
//       console.error('Ошибка drawImage — проверь CORS', e);
//     }

//     // масштаб stroke
//     const scaleX = exportCanvas.width / this.displayW;
//     const scaleY = exportCanvas.height / this.displayH;
//     const scale = (scaleX + scaleY) / 2;

//     // прорисовываем историю и текущий stroke
//     for (const s of this.history) this.drawStrokeToContext(ctx, s, scale, false);
//     if (this.currentStroke) this.drawStrokeToContext(ctx, this.currentStroke, scale, false);

//     const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[format];

//     return new Promise<Blob>((resolve, reject) => {
//       exportCanvas.toBlob(
//         (b) => {
//           if (!b) reject(new Error('Не удалось создать blob'));
//           else resolve(b);
//         },
//         mime,
//         0.92
//       );
//     });
//   }

//   // ------------------ Вспомогательный метод: fallback через <a> ------------------
//   private saveBlobViaAnchor(blob: Blob, format: string): void {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `drawing-${Date.now()}.${format}`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     URL.revokeObjectURL(url);
//   }

//   private drawStrokeToContext(
//     ctx: CanvasRenderingContext2D,
//     s: Stroke,
//     pointScale = 1,
//     isPreview = false
//   ) {
//     if (!ctx || !s.points.length) return;

//     ctx.save();

//     // Базовые настройки
//     ctx.lineJoin = 'round';
//     ctx.lineCap = 'round';
//     ctx.globalAlpha = s.opacity;
//     ctx.strokeStyle = s.color;

//     const baseWidth = Math.max(1, s.size * pointScale);

//     switch (s.tool) {
//       case 'pen':
//         ctx.globalCompositeOperation = 'source-over';
//         ctx.lineWidth = baseWidth;
//         ctx.beginPath();
//         for (let i = 0; i < s.points.length; i++) {
//           const p = s.points[i];
//           const x = p.x * pointScale;
//           const y = p.y * pointScale;
//           if (i === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.stroke();
//         break;

//       case 'marker':
//         ctx.globalCompositeOperation = 'source-over';
//         ctx.lineWidth = baseWidth * 2.5;
//         ctx.globalAlpha = Math.max(0.12, s.opacity * 0.6);
//         ctx.beginPath();
//         for (let i = 0; i < s.points.length; i++) {
//           const p = s.points[i];
//           const x = p.x * pointScale;
//           const y = p.y * pointScale;
//           if (i === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.stroke();
//         break;

//       case 'brush':
//         ctx.globalCompositeOperation = 'source-over';
//         ctx.lineWidth = baseWidth * 1.8;
//         ctx.shadowBlur = Math.max(0, baseWidth / 2);
//         ctx.shadowColor = s.color;
//         ctx.beginPath();
//         for (let i = 0; i < s.points.length; i++) {
//           const p = s.points[i];
//           const x = p.x * pointScale;
//           const y = p.y * pointScale;
//           if (i === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.stroke();
//         ctx.shadowBlur = 0;
//         break;

//       case 'shadow':
//         ctx.globalCompositeOperation = 'multiply';
//         ctx.lineWidth = baseWidth * 1.6;
//         ctx.shadowBlur = Math.max(4, baseWidth);
//         ctx.shadowColor = 'rgba(0,0,0,0.6)';
//         ctx.beginPath();
//         for (let i = 0; i < s.points.length; i++) {
//           const p = s.points[i];
//           const x = p.x * pointScale;
//           const y = p.y * pointScale + Math.max(1, baseWidth * 0.4);
//           if (i === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.stroke();
//         ctx.shadowBlur = 0;
//         break;

//       case 'spray':
//         ctx.globalCompositeOperation = 'source-over';
//         const density = Math.max(10, Math.round(baseWidth * 2.5));
//         for (let i = 1; i < s.points.length; i++) {
//           const p0 = s.points[i - 1];
//           const p1 = s.points[i];
//           const dx = p1.x - p0.x;
//           const dy = p1.y - p0.y;
//           const segLen = Math.hypot(dx, dy) || 1;
//           const steps = Math.max(1, Math.round(segLen / 2));
//           for (let step = 0; step < steps; step++) {
//             const t = step / steps;
//             const cx = p0.x + dx * t;
//             const cy = p0.y + dy * t;
//             for (let k = 0; k < density; k++) {
//               const r = Math.random() * baseWidth * 0.6;
//               const ang = Math.random() * Math.PI * 2;
//               const sx = (cx + Math.cos(ang) * r) * pointScale;
//               const sy = (cy + Math.sin(ang) * r) * pointScale;
//               ctx.fillStyle = s.color;
//               ctx.fillRect(sx, sy, 1, 1);
//             }
//           }
//         }
//         break;

//       default:
//         ctx.lineWidth = baseWidth;
//         ctx.beginPath();
//         for (let i = 0; i < s.points.length; i++) {
//           const p = s.points[i];
//           const x = p.x * pointScale;
//           const y = p.y * pointScale;
//           if (i === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.stroke();
//     }

//     ctx.restore();
//   }

//   undo() {
//     if (!this.history.length) return;
//     this.redoStack.push(this.history.pop()!);
//     this.renderAll();
//   }

//   redo() {
//     if (!this.redoStack.length) return;
//     this.history.push(this.redoStack.pop()!);
//     this.renderAll();
//   }

//   clearAll() {
//     this.history = [];
//     this.redoStack = [];
//     this.drawCtx?.clearRect(0, 0, this.displayW, this.displayH);
//     this.previewCtx?.clearRect(0, 0, this.displayW, this.displayH);
//   }
// }
