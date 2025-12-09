import { Component, AfterViewInit, OnInit, ElementRef, ViewChild } from '@angular/core';
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
  // ===========================
  //       ГАЛЕРЕЯ
  // ===========================
  photos: string[] = [];
  previewPhoto: string | null = null; // ✔ просмотрщик
  selectedPhoto: string | null = null; // ✔ рисовалка

  private backendBase = 'http://localhost:5012';

  // ===========================
  //        CANVAS
  // ===========================
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

  // ===========================
  //       ИНСТРУМЕНТЫ
  // ===========================
  currentTool: Tool = 'pen';
  currentColor = '#ff2d55';
  currentSize = 4;
  currentOpacity = 1;

  isDrawing = false;
  currentStroke: Stroke | null = null;

  history: Stroke[] = [];
  redoStack: Stroke[] = [];

  dpr = window.devicePixelRatio || 1;

  constructor(private host: ElementRef, private http: HttpClient) {}

  // ===========================
  //          INIT
  // ===========================
  ngOnInit(): void {
    this.loadPhotos();
  }

  ngAfterViewInit(): void {}

  // ===========================
  //   Загрузка фоток с бэка
  // ===========================
  loadPhotos() {
    const url = `${this.backendBase}/api/file/list`;

    this.http.get<string[]>(url).subscribe({
      next: (data) => {
        this.photos = data.map((p) => (p.startsWith('http') ? p : `${this.backendBase}${p}`));
      },
      error: (err) => console.error('Ошибка загрузки файлов:', err),
    });
  }

  // ===========================
  //       ПРОСМОТР ФОТО
  // ===========================
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
    if (i >= 0 && i < this.photos.length - 1) {
      this.previewPhoto = this.photos[i + 1];
    }
  }

  prevPhoto(): void {
    const i = this.currentIndex;
    if (i > 0) {
      this.previewPhoto = this.photos[i - 1];
    }
  }

  // ===========================
  //       ОТКРЫТЬ РИСОВАЛКУ
  // ===========================
  async openEditor(photo: string) {
    this.selectedPhoto = photo;

    await new Promise((res) => setTimeout(res));

    if (this.hiddenImage?.nativeElement) {
      this.hiddenImage.nativeElement.src = photo;
    }

    await this.waitForImageLoad();

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

    setTimeout(() => {
      const overlay = document.querySelector('.editor-overlay') as HTMLElement;
      if (overlay) overlay.style.display = 'none';
    }, 50);

    this.history = [];
    this.redoStack = [];
  }

  // ===========================
  //       LOAD IMAGE
  // ===========================
  private waitForImageLoad(): Promise<void> {
    return new Promise((res) => {
      const img = this.hiddenImage.nativeElement;

      // гарантия загрузки
      if (img.complete && img.naturalWidth > 0) return res();

      img.onload = () => res();
      img.onerror = () => res();
    });
  }

  // ===========================
  //     CANVAS INIT
  // ===========================
  private setupCanvases() {
    const img = this.hiddenImage.nativeElement;

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvases = [
      this.backgroundCanvas.nativeElement,
      this.drawingCanvas.nativeElement,
      this.previewCanvas.nativeElement,
    ];

    canvases.forEach((c) => {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    });

    this.bgCtx = this.backgroundCanvas.nativeElement.getContext('2d')!;
    this.drawCtx = this.drawingCanvas.nativeElement.getContext('2d')!;
    this.previewCtx = this.previewCanvas.nativeElement.getContext('2d')!;

    [this.bgCtx, this.drawCtx, this.previewCtx].forEach((ctx) => {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    });
  }

  private renderBackgroundImage() {
    const img = this.hiddenImage.nativeElement;
    this.bgCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
    this.bgCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
  }

  // ===========================
  //        POINTER EVENTS
  // ===========================
  onPointerDown = (ev: PointerEvent) => {
    (ev.target as Element).setPointerCapture(ev.pointerId);

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

    this.renderAll();
  };

  private addPointFromPointer(ev: PointerEvent) {
    const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const pressure = ev.pressure === 0 ? 1 : ev.pressure;

    this.currentStroke?.points.push({ x, y, pressure });
  }

  // ===========================
  //         RENDERING
  // ===========================
  private renderPreview() {
    this.previewCtx.clearRect(
      0,
      0,
      this.previewCanvas.nativeElement.width / this.dpr,
      this.previewCanvas.nativeElement.height / this.dpr
    );

    if (!this.currentStroke) return;
    this.drawStroke(this.previewCtx, this.currentStroke);
  }

  private renderAll() {
    this.drawCtx.clearRect(
      0,
      0,
      this.drawingCanvas.nativeElement.width / this.dpr,
      this.drawingCanvas.nativeElement.height / this.dpr
    );

    for (const s of this.history) {
      this.drawStroke(this.drawCtx, s);
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (s.tool) {
      case 'pen':
      case 'brush':
        this.strokePen(ctx, s);
        break;
      case 'marker':
        this.strokeMarker(ctx, s);
        break;
      case 'shadow':
        this.strokeShadow(ctx, s);
        break;
      case 'spray':
        this.strokeSpray(ctx, s);
        break;
    }

    ctx.restore();
  }

  private strokePen(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();

    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
  }

  private strokeMarker(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * 2;
    ctx.globalAlpha = s.opacity * 0.6;

    ctx.beginPath();
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  private strokeShadow(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = s.size * 1.5;

    ctx.beginPath();
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  private strokeSpray(ctx: CanvasRenderingContext2D, s: Stroke) {
    for (const p of s.points) {
      const count = Math.max(8, Math.round(s.size * 2));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * s.size;
        const rx = p.x + Math.cos(angle) * radius;
        const ry = p.y + Math.sin(angle) * radius;
        ctx.fillStyle = s.color;
        ctx.fillRect(rx, ry, 1, 1);
      }
    }
  }

  // ===========================
  //         UNDO / REDO
  // ===========================
  undo() {
    if (!this.history.length) return;
    this.redoStack.push(this.history.pop()!);
    this.renderAll();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.history.push(this.redoStack.pop()!);
    this.renderAll();
  }

  clearAll() {
    this.history = [];
    this.redoStack = [];
    this.renderAll();
  }

  // ===========================
  //         SAVE IMAGE
  // ===========================
  saveAs(format: 'png' | 'jpg' | 'webp') {
    const exportCanvas = document.createElement('canvas');
    const img = this.hiddenImage.nativeElement;

    exportCanvas.width = img.naturalWidth;
    exportCanvas.height = img.naturalHeight;

    const ectx = exportCanvas.getContext('2d')!;
    ectx.drawImage(img, 0, 0);

    const mime = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
    }[format];

    this.exportCanvasToFile(exportCanvas, mime, `drawing-${Date.now()}.${format}`);
  }

  private async exportCanvasToFile(canvas: HTMLCanvasElement, mime: string, defaultName: string) {
    const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), mime, 0.92));

    if (!blob) return;

    if ((window as any).showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: 'Image file', accept: { [mime]: ['.' + mime.split('/')[1]] } }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // cancelled
      }
    }

    // fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }
  test() {
    console.log('Angular CLICK OK');
  }
}
