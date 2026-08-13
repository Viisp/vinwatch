'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatedBorderButton as Button } from '@/components/ui/animated-border-button';

const CANVAS_SIZE = 280; // display size, px
const OUTPUT_SIZE = 512; // exported avatar resolution, px

type Props = {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
};

export function AvatarCropDialog({ file, onCancel, onCropped }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  // Load the image whenever a new file comes in, and reset pan/zoom.
  useEffect(() => {
    if (!file) {
      imgRef.current = null;
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // "cover" fit: smallest scale that fully covers the square canvas.
      setBaseScale(Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clampOffset(x: number, y: number, currentZoom: number) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const scale = baseScale * currentZoom;
    const halfExtraW = Math.max(0, (img.width * scale - CANVAS_SIZE) / 2);
    const halfExtraH = Math.max(0, (img.height * scale - CANVAS_SIZE) / 2);
    return { x: Math.min(halfExtraW, Math.max(-halfExtraW, x)), y: Math.min(halfExtraH, Math.max(-halfExtraH, y)) };
  }

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = baseScale * zoom;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      CANVAS_SIZE / 2 + offset.x - (img.width * scale) / 2,
      CANVAS_SIZE / 2 + offset.y - (img.height * scale) / 2,
      img.width * scale,
      img.height * scale
    );
    ctx.restore();
  }

  useEffect(draw, [zoom, offset, baseScale]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = clampOffset(drag.offsetX + (e.clientX - drag.startX), drag.offsetY + (e.clientY - drag.startY), zoom);
    setOffset(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    setOffset((prev) => clampOffset(prev.x, prev.y, next));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const output = document.createElement('canvas');
    output.width = OUTPUT_SIZE;
    output.height = OUTPUT_SIZE;
    const ctx = output.getContext('2d');
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / CANVAS_SIZE;
    const scale = baseScale * zoom * ratio;
    ctx.drawImage(
      img,
      (OUTPUT_SIZE / 2) + offset.x * ratio - (img.width * scale) / 2,
      (OUTPUT_SIZE / 2) + offset.y * ratio - (img.height * scale) / 2,
      img.width * scale,
      img.height * scale
    );
    output.toBlob((blob) => { if (blob) onCropped(blob); }, 'image/jpeg', 0.92);
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-[#0d1b2a] border-[#243552]">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Recadrer la photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-full bg-[#1a2d42] cursor-move touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <div className="w-full flex items-center gap-3 px-2">
            <span className="text-xs text-slate-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-[#00c896]"
            />
          </div>
          <p className="text-xs text-slate-500">Fais glisser l&apos;image pour la repositionner.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={handleConfirm}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
