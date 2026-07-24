"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Crop and reposition at a locked 2:3 ratio (FR-08). The dialog returns the
 * crop rectangle in source-image pixels; the server does the actual cutting and
 * resizing with sharp, so the ratio can never be distorted client-side.
 */
export function CoverCropDialog({
  file,
  open,
  onCancel,
  onConfirm,
  busy,
}: {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (crop: Area) => void;
  busy: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);

  // Object URL for preview, revoked when the file changes or the dialog closes.
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Position the cover</DialogTitle>
          <DialogDescription>
            Drag to reposition and pinch or use the slider to zoom. Covers are
            always 2:3.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-card relative h-80 w-full overflow-hidden rounded-lg">
          {imageUrl ? (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={2 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <label className="text-muted-foreground flex items-center gap-3 text-xs">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => pixels && onConfirm(pixels)}
            disabled={busy || !pixels}
          >
            {busy ? "Uploading…" : "Save cover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
