import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface PhotoCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (croppedImageUrl: string, cropSettings: any) => void;
  existingCrop?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

export default function PhotoCropper({ 
  isOpen, 
  onClose, 
  imageUrl, 
  onCrop,
  existingCrop
}: PhotoCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [crop, setCrop] = useState({
    x: existingCrop?.x ?? 0,
    y: existingCrop?.y ?? 0,
    scale: existingCrop?.scale ?? 1,
    rotation: existingCrop?.rotation ?? 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (existingCrop) {
      setCrop({
        x: existingCrop.x,
        y: existingCrop.y,
        scale: existingCrop.scale,
        rotation: existingCrop.rotation
      });
    }
  }, [existingCrop]);

  const drawImageOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to avatar size (128x128 for high quality)
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context
    ctx.save();

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.clip();

    // Calculate image dimensions and positioning
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let drawWidth = size * crop.scale;
    let drawHeight = size * crop.scale;
    
    if (imageAspect > 1) {
      drawHeight = drawHeight / imageAspect;
    } else {
      drawWidth = drawWidth * imageAspect;
    }

    // Apply transformations
    ctx.translate(size / 2, size / 2);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    // Draw image with crop position
    const drawX = (size - drawWidth) / 2 + crop.x;
    const drawY = (size - drawHeight) / 2 + crop.y;
    
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    // Restore context
    ctx.restore();
  }, [crop, imageLoaded]);

  useEffect(() => {
    drawImageOnCanvas();
  }, [drawImageOnCanvas]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setCrop(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (value: number[]) => {
    setCrop(prev => ({ ...prev, scale: value[0] }));
  };

  const handleRotationChange = (value: number[]) => {
    setCrop(prev => ({ ...prev, rotation: value[0] }));
  };

  const resetCrop = () => {
    setCrop({ x: 0, y: 0, scale: 1, rotation: 0 });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCrop(croppedImageUrl, crop);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Position Your Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative">
            <div 
              ref={containerRef}
              className="w-64 h-64 mx-auto border-2 border-dashed border-gray-300 rounded-full overflow-hidden bg-gray-50 relative cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.scale}) rotate(${crop.rotation}deg)`,
                  transformOrigin: 'center'
                }}
                onLoad={handleImageLoad}
                draggable={false}
              />
              
              {/* Move cursor indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Move className="h-6 w-6 text-white opacity-50" />
              </div>
            </div>
            
            {/* Hidden canvas for final output */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Scale Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ZoomOut className="h-4 w-4" />
                  Zoom
                </Label>
                <span className="text-sm text-gray-500">{Math.round(crop.scale * 100)}%</span>
              </div>
              <Slider
                value={[crop.scale]}
                onValueChange={handleScaleChange}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Rotation
                </Label>
                <span className="text-sm text-gray-500">{crop.rotation}°</span>
              </div>
              <Slider
                value={[crop.rotation]}
                onValueChange={handleRotationChange}
                min={-180}
                max={180}
                step={5}
                className="w-full"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetCrop} className="flex-1">
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCrop(prev => ({ ...prev, rotation: prev.rotation - 90 }))}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCrop(prev => ({ ...prev, rotation: prev.rotation + 90 }))}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}