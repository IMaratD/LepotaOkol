import {
  Component,
  AfterViewInit,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

console.log('ENV:', environment);

type Tool = 'pen' | 'marker' | 'brush' | 'shadow' | 'spray';

interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

interface Photo {
  title: string;
  url: string;
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
  isLoading = false;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;

  editorWidth = Math.min(900, window.innerWidth * 0.9);
  editorHeight = Math.min(600, window.innerHeight * 0.75);

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

  displayW = 0;
  displayH = 0;
  private origW = 0;
  private origH = 0;

  constructor(private host: ElementRef, private http: HttpClient) {}

  private resizeCanvases() {
    const img = this.hiddenImage.nativeElement;
    if (!img) return;

    const maxW = Math.min(900, window.innerWidth * 0.9);
    const maxH = Math.min(600, window.innerHeight * 0.75);

    const { width, height } = this.getFitSize(img.naturalWidth, img.naturalHeight, maxW, maxH);

    this.displayW = width;
    this.displayH = height;

    this.initCanvases();
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.canvasesReady) {
      return;
    }

    this.resizeCanvases();
    this.drawBackground(this.hiddenImage.nativeElement);
  }

  private canvasesReady = false;

  ngOnInit() {
    this.loadPhotos();
    // this.http.get<Photo[]>('assets/images/photos.json');
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit called');
  }

  loadPhotos() {
    this.http.get<string[]>('assets/images/photos.json').subscribe({
      next: (data) => {
        this.photos = data;
      },
      error: (err) => {
        console.error('Ошибка загрузки photos.json', err);
      },
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

  private getFitSize(imgW: number, imgH: number, maxW: number, maxH: number) {
    const ratio = Math.min(maxW / imgW, maxH / imgH);

    return {
      width: Math.round(imgW * ratio),
      height: Math.round(imgH * ratio),
    };
  }

  async openEditor(imageUrl: string) {
    this.selectedPhoto = imageUrl;
    this.isLoading = true;
  }

  onHiddenImageLoad() {
    const img = this.hiddenImage.nativeElement;

    this.origW = img.naturalWidth;
    this.origH = img.naturalHeight;

    const maxW = Math.min(900, window.innerWidth * 0.9);
    const maxH = Math.min(600, window.innerHeight * 0.75);

    const { width, height } = this.getFitSize(this.origW, this.origH, maxW, maxH);

    this.displayW = width;
    this.displayH = height;

    this.initCanvases();
    this.drawBackground(img);

    this.isLoading = false;
    this.canvasesReady = true;
  }

  closeEditor() {
    this.selectedPhoto = null;
    this.history = [];
    this.redoStack = [];
    this.isDrawing = false;
    this.currentStroke = null;
    this.canvasesReady = false;
  }

  private initCanvases() {
    const bg = this.backgroundCanvas.nativeElement;
    const draw = this.drawingCanvas.nativeElement;
    const preview = this.previewCanvas.nativeElement;

    for (const c of [bg, draw, preview]) {
      c.width = this.displayW * this.dpr;
      c.height = this.displayH * this.dpr;
      c.style.width = this.displayW + 'px';
      c.style.height = this.displayH + 'px';
    }

    this.bgCtx = bg.getContext('2d')!;
    this.drawCtx = draw.getContext('2d')!;
    this.previewCtx = preview.getContext('2d')!;

    this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.previewCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private drawBackground(img: HTMLImageElement) {
    if (!this.bgCtx || !img) return;

    const bg = this.backgroundCanvas.nativeElement;
    this.bgCtx.clearRect(0, 0, bg.width, bg.height);

    const { width, height } = this.getFitSize(
      img.naturalWidth,
      img.naturalHeight,
      this.displayW,
      this.displayH
    );

    const x = (this.displayW - width) / 2;
    const y = (this.displayH - height) / 2;

    this.bgCtx.drawImage(img, x, y, width, height);
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
    const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();

    this.currentStroke.points.push({
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      pressure: ev.pressure || 1,
    });

    this.redoStack = [];
    this.renderPreview();
  };

  onPointerMove = (ev: PointerEvent) => {
    if (!this.isDrawing || !this.currentStroke) return;

    const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();

    this.currentStroke.points.push({
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      pressure: ev.pressure || 1,
    });

    this.renderPreview();
  };

  onPointerUp = (ev: PointerEvent) => {
    if (!this.isDrawing || !this.currentStroke) return;
    this.history.push(this.currentStroke);
    this.currentStroke = null;
    this.isDrawing = false;
    this.previewCtx.clearRect(0, 0, this.displayW, this.displayH);
    this.renderAll();
    try {
      (ev.target as Element).releasePointerCapture(ev.pointerId);
    } catch {}
  };

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
