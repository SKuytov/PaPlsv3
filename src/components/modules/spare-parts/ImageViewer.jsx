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
  };

  const handleMouseDown = (e) => {
    if (zoom === 1) return; // Only allow panning when zoomed in
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom === 1) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate boundaries based on zoom level
    const container = containerRef.current;
    if (container && imageRef.current) {
      const containerRect = container.getBoundingClientRect();
      const maxX = (imageRef.current.width * zoom - containerRect.width) / 2;
      const maxY = (imageRef.current.height * zoom - containerRect.height) / 2;

      const boundedX = Math.max(-maxX, Math.min(maxX, newX));
      const boundedY = Math.max(-maxY, Math.min(maxY, newY));

      setPan({ x: boundedX, y: boundedY });
    }
  };

  const handleMouseUp = () => {
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

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isDragging, dragStart, zoom, pan]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 gap-0 flex flex-col bg-slate-900 border-slate-800">
        <DialogTitle className="sr-only">Image Viewer - {imageName}</DialogTitle>

        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{imageName}</h2>
            <p className="text-sm text-slate-400 mt-1">Zoom: {Math.round(zoom * 100)}% | Scroll to zoom, drag to pan</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={() => onClose(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleMouseDown}
        >
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              transformOrigin: 'center',
            }}
            className="flex items-center justify-center"
          >
            <ImageWithFallback
              ref={imageRef}
              src={imageUrl}
              alt={imageName}
              className="max-h-[calc(90vh-140px)] max-w-full object-contain"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="w-4 h-4" />
            Zoom Out
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
            Zoom In
          </Button>

          <div className="w-px h-6 bg-slate-600" />

          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;