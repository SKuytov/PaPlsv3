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

  const handleMouseDown = (e) => {
    if (zoom === 1) return; // Only allow panning when zoomed in
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPan.x,
      y: e.clientY - currentPan.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom === 1) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate max pan boundaries based on zoom level and container size
    const container = containerRef.current;
    if (container && imageRef.current) {
      const containerRect = container.getBoundingClientRect();
      const scaledWidth = imageRef.current.naturalWidth * zoom;
      const scaledHeight = imageRef.current.naturalHeight * zoom;

      // Calculate how much space we have to pan
      const maxPanX = (scaledWidth - containerRect.width) / 2;
      const maxPanY = (scaledHeight - containerRect.height) / 2;

      // Constrain pan within boundaries
      const boundedX = Math.max(-maxPanX, Math.min(maxPanX, newX));
      const boundedY = Math.max(-maxPanY, Math.min(maxPanY, newY));

      setCurrentPan({ x: boundedX, y: boundedY });
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
  }, [isDragging, dragStart, zoom, currentPan]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 gap-0 flex flex-col bg-slate-900 border-slate-800">
        <DialogTitle className="sr-only">Image Viewer - {imageName}</DialogTitle>

        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{imageName}</h2>
            <p className="text-sm text-slate-400 mt-1">Zoom: {Math.round(zoom * 100)}% | Scroll to zoom{zoom > 1 ? ', drag to pan' : ''}</p>
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
          className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleMouseDown}
        >
          <div
            style={{
              transform: `translate(${currentPan.x}px, ${currentPan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              transformOrigin: 'center',
            }}
            className="flex items-center justify-center"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageName}
              className="max-h-[calc(90vh-140px)] max-w-full object-contain select-none"
              onLoad={() => {
                // Reset pan on image load to ensure proper calculations
                setCurrentPan({ x: 0, y: 0 });
              }}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-center gap-2 shrink-0">
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