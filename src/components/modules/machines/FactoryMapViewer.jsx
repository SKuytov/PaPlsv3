// src/components/machines/FactoryMapViewer.jsx
// 🗺️ Interactive Factory Map - Machine Location Overlay
// Displays factory floor plan with machine locations and status

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, MapPin, Info } from 'lucide-react';
import ImageWithFallback from '@/components/common/ImageWithFallback';

const FactoryMapViewer = ({ 
  mapImageUrl, 
  machines, 
  metrics, 
  selectedMachineId,
  onMachineSelect 
}) => {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // Get machine status color for map pins
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
    if (healthScore >= 90) return 16;
    if (healthScore >= 75) return 18;
    if (healthScore >= 60) return 20;
    return 24;
  };

  // Handle mouse wheel zoom
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
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoom, pan]);

  const resetView = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(zoom + 20, 200))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-slate-600 min-w-12">
            {zoom}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(zoom - 20, 50))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={resetView}>
            Reset
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Operational</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Down</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden bg-slate-50">
        <div
          ref={mapContainerRef}
          className="relative w-full h-96 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-100"
          onMouseDown={handleMouseDown}
        >
          {/* Factory Map Image */}
          <div
            className="absolute transition-transform origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              width: '100%',
              height: '100%'
            }}
          >
            <ImageWithFallback
              src={mapImageUrl}
              alt="Factory Floor Plan"
              className="w-full h-full object-contain"
            />

            {/* Machine Pins */}
            {machines.map((machine) => {
              const machineMetrics = metrics.find(m => m.machine_id === machine.id);
              if (!machineMetrics || !machineMetrics.map_x_coordinate || !machineMetrics.map_y_coordinate) {
                return null;
              }

              const isSelected = selectedMachineId === machine.id;

              return (
                <div
                  key={machine.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${machineMetrics.map_x_coordinate}%`,
                    top: `${machineMetrics.map_y_coordinate}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMachineSelect(machine.id);
                  }}
                >
                  {/* Outer Ring */}
                  <div
                    className={`absolute rounded-full transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : 'group-hover:ring-2 group-hover:ring-slate-400'
                    }`}
                    style={{
                      width: getHealthSize(machineMetrics.health_score) + 8,
                      height: getHealthSize(machineMetrics.health_score) + 8,
                      left: -(getHealthSize(machineMetrics.health_score) + 8) / 2,
                      top: -(getHealthSize(machineMetrics.health_score) + 8) / 2,
                      border: `2px solid ${getStatusColor(machine.id)}`,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                  />

                  {/* Inner Circle - Status */}
                  <div
                    className="absolute rounded-full transition-all"
                    style={{
                      width: getHealthSize(machineMetrics.health_score),
                      height: getHealthSize(machineMetrics.health_score),
                      left: -getHealthSize(machineMetrics.health_score) / 2,
                      top: -getHealthSize(machineMetrics.health_score) / 2,
                      backgroundColor: getStatusColor(machine.id)
                    }}
                  />

                  {/* Tooltip on Hover */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block bg-slate-900 text-white p-2 rounded shadow-lg whitespace-nowrap z-10">
                    <p className="font-semibold text-xs">{machine.name}</p>
                    <p className="text-xs text-slate-300">
                      Health: {machineMetrics.health_score}%
                    </p>
                    <p className="text-xs text-slate-300">
                      Status: {machineMetrics.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Indicator */}
          <div className="absolute top-2 left-2 text-xs text-slate-500 pointer-events-none">
            <Info className="w-4 h-4 inline mr-1" />
            Scroll to zoom • Drag to pan
          </div>
        </div>
      </Card>

      {/* Selected Machine Info */}
      {selectedMachineId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            {machines.map((machine) => {
              if (machine.id !== selectedMachineId) return null;

              const machineMetrics = metrics.find(m => m.machine_id === machine.id);
              if (!machineMetrics) return null;

              return (
                <div key={machine.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{machine.name}</p>
                      <p className="text-sm text-slate-600 font-mono">{machine.machine_code}</p>
                    </div>
                    <Badge className={`${
                      machineMetrics.status === 'down' ? 'bg-red-100 text-red-800' :
                      machineMetrics.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {machineMetrics.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Building</p>
                      <p className="font-semibold text-slate-900">
                        {machineMetrics.building || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Zone</p>
                      <p className="font-semibold text-slate-900">
                        {machineMetrics.location_zone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Floor</p>
                      <p className="font-semibold text-slate-900">
                        {machineMetrics.floor_level || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Coordinates</p>
                      <p className="font-semibold text-slate-900 font-mono text-sm">
                        ({machineMetrics.map_x_coordinate}, {machineMetrics.map_y_coordinate})
                      </p>
                    </div>
                  </div>

                  {machineMetrics.accessibility_notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-slate-500 uppercase mb-2">Accessibility Notes</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        {machineMetrics.accessibility_notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FactoryMapViewer;