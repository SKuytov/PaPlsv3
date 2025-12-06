// src/components/machines/FactoryMapViewer_Responsive.jsx
// 🗺️ Interactive Factory Map - Mobile Responsive

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, MapPin, Info, RotateCcw } from 'lucide-react';
import ImageWithFallback from '@/components/common/ImageWithFallback';

const FactoryMapViewer = ({ mapImageUrl, machines, metrics, selectedMachineId, onMachineSelect }) => {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedInfo, setSelectedInfo] = useState(null);
  const mapContainerRef = useRef(null);

  // Get machine status color
  const getStatusColor = (machineId) => {
    const metric = metrics.find(m => m.machine_id === machineId);
    if (!metric) return '#6B7280'; // gray
    switch (metric.status) {
      case 'down': return '#DC2626'; // red
      case 'maintenance': return '#FBBF24'; // amber
      default: return '#10B981'; // green
    }
  };

  // Get health indicator size
  const getHealthSize = (healthScore) => {
    if (healthScore >= 90) return 14;
    if (healthScore >= 75) return 16;
    if (healthScore >= 60) return 18;
    return 20;
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.min(Math.max(zoom + delta, 50), 200);
    setZoom(newZoom);
  };

  // Handle pan drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setDragStart({ distance });
    } else if (e.touches.length === 1) {
      // Pan
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      if (dragStart.distance) {
        const delta = distance - dragStart.distance;
        const newZoom = Math.min(Math.max(zoom + delta / 50, 50), 200);
        setZoom(newZoom);
      }
    } else if (isDragging && e.touches.length === 1) {
      // Pan
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, zoom, pan]);

  const resetView = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setSelectedInfo(null);
  };

  const selectedMachine = machines.find(m => m.id === selectedMachineId);
  const selectedMetrics = selectedMachine ? metrics.find(m => m.machine_id === selectedMachine.id) : null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="p-2 sm:p-4 border-b bg-white">
        <h3 className="text-sm sm:text-lg font-bold text-slate-900">Factory Map</h3>
        <p className="text-xs text-slate-600">Drag to pan, scroll/pinch to zoom</p>
      </div>

      <div className="flex-1 flex gap-2 sm:gap-4 overflow-hidden p-2 sm:p-4">
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="flex-1 relative bg-white rounded-lg border-2 border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          {/* Map Content */}
          <div
            className="w-full h-full origin-center transition-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            {mapImageUrl && (
              <ImageWithFallback
                src={mapImageUrl}
                alt="Factory Map"
                className="w-full h-full object-contain"
              />
            )}

            {/* Machine Pins */}
            {machines.map(machine => {
              const machineMetrics = metrics.find(m => m.machine_id === machine.id);
              if (!machineMetrics) return null;

              const x = machineMetrics.map_x_coordinate || 50;
              const y = machineMetrics.map_y_coordinate || 50;
              const isSelected = machine.id === selectedMachineId;

              return (
                <div
                  key={machine.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => {
                    onMachineSelect(machine.id);
                    setSelectedInfo(machine.id);
                  }}
                >
                  {/* Pin Circle */}
                  <div
                    className={`relative transition-all ${isSelected ? 'scale-125' : ''}`}
                    style={{
                      width: getHealthSize(machineMetrics.health_score),
                      height: getHealthSize(machineMetrics.health_score),
                      backgroundColor: getStatusColor(machine.id),
                      borderRadius: '50%',
                      border: isSelected ? '3px solid white' : '2px solid white',
                      boxShadow: isSelected ? `0 0 12px ${getStatusColor(machine.id)}` : `0 2px 8px rgba(0,0,0,0.2)`
                    }}
                  />

                  {/* Tooltip on hover/select */}
                  {isSelected && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 p-2 whitespace-nowrap text-xs z-10 pointer-events-none">
                      <p className="font-semibold">{machine.name}</p>
                      <p className="text-slate-600">Health: {machineMetrics.health_score}%</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls - Repositioned for mobile */}
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 flex flex-col gap-2 z-20">
            <Button
              size="sm"
              variant="default"
              onClick={() => setZoom(Math.min(zoom + 20, 200))}
              className="h-9 w-9 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setZoom(Math.max(zoom - 20, 50))}
              className="h-9 w-9 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
              className="h-9 w-9 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Level Indicator */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
            {zoom}%
          </div>
        </div>

        {/* Info Panel - Responsive */}
        {selectedMachine && selectedMetrics && (
          <div className="hidden lg:block w-72 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="font-bold text-slate-900">{selectedMachine.name}</h4>
              <p className="text-xs text-slate-600 font-mono">{selectedMachine.machine_code}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600">Health Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        selectedMetrics.health_score >= 90 ? 'bg-green-500' :
                        selectedMetrics.health_score >= 75 ? 'bg-blue-500' :
                        selectedMetrics.health_score >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${selectedMetrics.health_score}%` }}
                    />
                  </div>
                  <span className="font-bold text-sm">{selectedMetrics.health_score}%</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600">Current Status</p>
                <Badge className="mt-1">
                  {selectedMetrics.status.charAt(0).toUpperCase() + selectedMetrics.status.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-600">Building</p>
                  <p className="mt-1">{selectedMetrics.building || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Zone</p>
                  <p className="mt-1">{selectedMetrics.location_zone || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Floor</p>
                  <p className="mt-1">{selectedMetrics.floor_level || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Availability</p>
                  <p className="mt-1">{selectedMetrics.availability_percent}%</p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-slate-600 mb-2">Accessibility Notes</p>
                <p className="text-xs text-slate-700">{selectedMetrics.accessibility_notes || 'No notes'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Info Card - Shows below map */}
        {selectedMachine && selectedMetrics && (
          <div className="lg:hidden w-full max-h-40 bg-white rounded-lg border border-slate-200 p-3 overflow-y-auto">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{selectedMachine.name}</h4>
                <p className="text-xs text-slate-600 font-mono">{selectedMachine.machine_code}</p>
              </div>
              <Badge className="flex-shrink-0">
                {selectedMetrics.status.charAt(0).toUpperCase() + selectedMetrics.status.slice(1)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="font-semibold text-slate-600">Health</p>
                <p className="font-bold">{selectedMetrics.health_score}%</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Zone</p>
                <p className="font-bold">{selectedMetrics.location_zone || 'N/A'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Avail.</p>
                <p className="font-bold">{selectedMetrics.availability_percent}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FactoryMapViewer;