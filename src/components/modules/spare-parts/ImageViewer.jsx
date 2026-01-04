import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ImageWithFallback from '@/components/common/ImageWithFallback';

const ImageViewer = ({ open, imageUrl, imageName, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPan, setCurrentPan] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.2;

  // Reset zoom and pan when modal opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCurrentPan({ x: 0, y: 0 });
    }
  }, [open]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCurrentPan({ x: 0, y: 0 });
  };

  // Calculate pan boundaries based on zoom level and image/container dimensions
  const calculatePanBounds = (zoomLevel) => {
    if (!containerRef.current || !imageRef.current || zoomLevel <= 1) {
      return { maxX: 0, maxY: 0, minX: 0, minY: 0 };
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get actual image dimensions
    const img = imageRef.current;
    const imgWidth = img.naturalWidth || imageSize.width;
    const imgHeight = img.naturalHeight || imageSize.height;
    
    // Calculate scaled dimensions
    const scaledWidth = imgWidth * zoomLevel;
    const scaledHeight = imgHeight * zoomLevel;
    
    // Calculate maximum pan allowed (image extends beyond container)
    const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    return {
      maxX,
      maxY,
      minX: -maxX,
      minY: -maxY,
    };
  };

  const constrainPan = (x, y, zoomLevel) => {
    const bounds = calculatePanBounds(zoomLevel);
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
    };
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return; // Only allow panning when zoomed in
    e.preventDefault();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPan.x,
      y: e.clientY - currentPan.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const constrained = constrainPan(newX, newY, zoom);
    setCurrentPan(constrained);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - currentPan.x,
      y: touch.clientY - currentPan.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    const constrained = constrainPan(newX, newY, zoom);
    setCurrentPan(constrained);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Attach event listeners to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mouseMove = (e) => handleMouseMove(e);
    const mouseUp = () => handleMouseUp();
    const touchMove = (e) => handleTouchMove(e);
    const touchEnd = () => handleTouchEnd();
    const wheel = (e) => handleWheel(e);

    // Mouse events
    container.addEventListener('mousemove', mouseMove);
    container.addEventListener('mouseup', mouseUp);
    container.addEventListener('mouseleave', mouseUp);
    
    // Touch events
    container.addEventListener('touchmove', touchMove, { passive: false });
    container.addEventListener('touchend', touchEnd);
    container.addEventListener('touchcancel', touchEnd);
    
    // Wheel event
    container.addEventListener('wheel', wheel, { passive: false });

    return () => {
      container.removeEventListener('mousemove', mouseMove);
      container.removeEventListener('mouseup', mouseUp);
      container.removeEventListener('mouseleave', mouseUp);
      container.removeEventListener('touchmove', touchMove);
      container.removeEventListener('touchend', touchEnd);
      container.removeEventListener('touchcancel', touchEnd);
      container.removeEventListener('wheel', wheel);
    };
  }, [isDragging, dragStart, zoom, currentPan]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      // Reset pan on image load
      setCurrentPan({ x: 0, y: 0 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 gap-0 flex flex-col bg-slate-900 border-slate-800">
        <DialogTitle className="sr-only">Image Viewer - {imageName}</DialogTitle>

        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{imageName}</h2>
            <p className="text-sm text-slate-400 mt-1">
              Zoom: {Math.round(zoom * 100)}% | Scroll to zoom{zoom > 1 ? ', drag or touch to pan' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-700 flex-shrink-0"
            onClick={() => onClose(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-slate-900 flex items-center justify-center relative ${
            zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div
            style={{
              transform: `translate(${currentPan.x}px, ${currentPan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              transformOrigin: 'center',
              willChange: isDragging ? 'transform' : 'auto',
            }}
            className="flex items-center justify-center"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageName}
              className="max-h-[calc(90vh-140px)] max-w-full object-contain select-none pointer-events-none"
              onLoad={handleImageLoad}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom Out</span>
            <span className="sm:hidden">−</span>
          </Button>

          <div className="text-white text-sm font-mono px-3 py-1 bg-slate-900 rounded border border-slate-700">
            {Math.round(zoom * 100)}%
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom In</span>
            <span className="sm:hidden">+</span>
          </Button>

          <div className="w-px h-6 bg-slate-600" />

          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
            <span className="sm:hidden">↺</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;