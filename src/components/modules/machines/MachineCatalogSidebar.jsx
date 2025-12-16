import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Plus, Edit2, Trash2, ZoomIn, ZoomOut,
  Package, AlertCircle, Settings, Eye, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Interactive Canvas Component
const InteractiveCanvas = ({
  imageUrl,
  hotspots,
  selectedHotspot,
  onHotspotClick,
  onHotspotAdd,
  editMode,
  zoom,
  brandColor
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [tempRect, setTempRect] = useState(null);

  const handleCanvasClick = (e) => {
    if (!editMode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      for (let hotspot of hotspots) {
        if (
          x >= hotspot.position_data.x &&
          x <= hotspot.position_data.x + hotspot.position_data.width &&
          y >= hotspot.position_data.y &&
          y <= hotspot.position_data.y + hotspot.position_data.height
        ) {
          onHotspotClick(hotspot);
          return;
        }
      }
    }
  };

  const handleMouseDown = (e) => {
    if (!editMode) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPoint({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    });
  };

  const handleMouseMove = (e) => {
    if (!editMode || !isDrawing || !startPoint) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;

    setTempRect({
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y)
    });
  };

  const handleMouseUp = (e) => {
    if (!editMode || !tempRect) {
      setIsDrawing(false);
      setStartPoint(null);
      return;
    }

    if (tempRect.width > 10 && tempRect.height > 10) {
      onHotspotAdd(tempRect);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setTempRect(null);
  };

  return (
    <div
      ref={canvasRef}
      className="relative bg-slate-100 border-2 border-slate-300 rounded-lg overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        height: '400px',
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        cursor: editMode ? 'crosshair' : 'pointer'
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Machine Diagram"
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {hotspots.map((hotspot, idx) => (
          <rect
            key={idx}
            x={hotspot.position_data.x}
            y={hotspot.position_data.y}
            width={hotspot.position_data.width}
            height={hotspot.position_data.height}
            fill={selectedHotspot?.id === hotspot.id ? brandColor : `${brandColor}40`}
            stroke={selectedHotspot?.id === hotspot.id ? brandColor.replace('0.2', '1') : brandColor}
            strokeWidth="2"
            className="hover:opacity-75 transition-opacity"
            style={{ cursor: editMode ? 'crosshair' : 'pointer' }}
          />
        ))}

        {tempRect && (
          <rect
            x={tempRect.x}
            y={tempRect.y}
            width={tempRect.width}
            height={tempRect.height}
            fill="rgba(34, 197, 94, 0.2)"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {editMode && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
          ✏️ Draw Mode
        </div>
      )}
    </div>
  );
};

// Main Component
const MachineCatalogSidebar = ({ machineId, machineName, userRole }) => {
  const { toast } = useToast();
  const [catalogData, setCatalogData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [allParts, setAllParts] = useState([]);
  const [showPartSelector, setShowPartSelector] = useState(false);
  const fileInputRef = useRef(null);

  // Brand color - customize here
  const BRAND_COLOR = 'rgba(59, 130, 246, 0.2)'; // Your brand primary with transparency

  // Check if user is admin
  const isAdmin = ['God Admin', 'Admin', 'Technical Director'].includes(userRole);

  useEffect(() => {
    loadCatalogData();
  }, [machineId]);

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_parts_catalogs')
        .select(`
          *,
          hotspots:machine_hotspots(
            id,
            position_data,
            part_id,
            label,
            color,
            part:spare_parts(id, name, part_number, current_quantity, unit_of_measure)
          )
        `)
        .eq('machine_id', machineId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCatalogData(data || null);
    } catch (err) {
      console.error('Error loading catalog:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load catalog'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, part_number, current_quantity, unit_of_measure')
        .order('name');
      if (error) throw error;
      setAllParts(data || []);
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  const handleImageUpload = async (e) => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only admins can upload diagrams'
      });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `machine-${machineId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('machine-diagrams')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('machine-diagrams')
        .getPublicUrl(fileName);

      const catalogPayload = {
        machine_id: machineId,
        diagram_url: urlData.publicUrl,
        diagram_name: file.name,
        is_active: true
      };

      let result;
      if (catalogData?.id) {
        const { data: updated, error: updateError } = await supabase
          .from('machine_parts_catalogs')
          .update(catalogPayload)
          .eq('machine_id', machineId)
          .select()
          .single();
        if (updateError) throw updateError;
        result = updated;
      } else {
        const { data: created, error: createError } = await supabase
          .from('machine_parts_catalogs')
          .insert(catalogPayload)
          .select()
          .single();
        if (createError) throw createError;
        result = created;
      }

      setCatalogData(prev => ({
        ...prev || {},
        ...result,
        hotspots: prev?.hotspots || []
      }));

      toast({ title: 'Success', description: 'Diagram uploaded' });
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message
      });
    }
  };

  const handleAddHotspot = async (rect) => {
    if (!selectedHotspot?.part_id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a spare part first'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('machine_hotspots')
        .insert({
          catalog_id: catalogData.id,
          part_id: selectedHotspot.part_id,
          position_data: rect,
          label: selectedHotspot.label || 'Part',
          color: BRAND_COLOR
        })
        .select()
        .single();

      if (error) throw error;

      setCatalogData(prev => ({
        ...prev,
        hotspots: [...(prev?.hotspots || []), data]
      }));

      toast({ title: 'Success', description: 'Hotspot added' });
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add hotspot'
      });
    }
  };

  const handleDeleteHotspot = async (hotspotId) => {
    try {
      const { error } = await supabase
        .from('machine_hotspots')
        .delete()
        .eq('id', hotspotId);

      if (error) throw error;

      setCatalogData(prev => ({
        ...prev,
        hotspots: prev.hotspots.filter(h => h.id !== hotspotId)
      }));

      setSelectedHotspot(null);
      toast({ title: 'Deleted', description: 'Hotspot removed' });
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete hotspot'
      });
    }
  };

  if (loading) return <LoadingSpinner message="Loading catalog..." />;

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-2 border-b">
        <h3 className="font-semibold text-sm">{machineName}</h3>
        {isAdmin && (
          <Button
            size="sm"
            variant={editMode ? 'default' : 'outline'}
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'bg-green-600 h-8' : 'h-8'}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            {editMode ? 'Done' : 'Edit'}
          </Button>
        )}
      </div>

      {/* Diagram Section */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {catalogData?.diagram_url ? (
            <>
              <div className="flex gap-1 justify-center mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  disabled={zoom <= 0.5}
                  className="h-7 px-2"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium w-10 text-center flex items-center justify-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  disabled={zoom >= 2}
                  className="h-7 px-2"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>

              <div className="border rounded overflow-auto" style={{ maxHeight: '300px' }}>
                <InteractiveCanvas
                  imageUrl={catalogData.diagram_url}
                  hotspots={catalogData.hotspots || []}
                  selectedHotspot={selectedHotspot}
                  onHotspotClick={setSelectedHotspot}
                  onHotspotAdd={handleAddHotspot}
                  editMode={editMode && isAdmin}
                  zoom={zoom}
                  brandColor={BRAND_COLOR}
                />
              </div>
            </>
          ) : isAdmin ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium text-slate-600">Upload Diagram</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              <Lock className="h-5 w-5 mx-auto mb-2 text-slate-400" />
              No catalog available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Part Details */}
      {selectedHotspot?.part && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <Package className="h-3 w-3" />
              Part Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-3 pb-3 text-xs">
            <div>
              <p className="text-xs text-slate-600 font-semibold">Name</p>
              <p className="font-medium">{selectedHotspot.part.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold">Part #</p>
              <p className="font-mono text-xs">{selectedHotspot.part.part_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold">Stock</p>
              <Badge variant={selectedHotspot.part.current_quantity > 0 ? 'default' : 'destructive'} className="text-xs">
                {selectedHotspot.part.current_quantity} {selectedHotspot.part.unit_of_measure}
              </Badge>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                className="w-full mt-2 h-6 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Hotspot (Edit Mode) */}
      {editMode && isAdmin && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Add Hotspot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <button
              onClick={() => {
                setShowPartSelector(!showPartSelector);
                if (allParts.length === 0) loadAllParts();
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-left hover:bg-slate-50 flex items-center justify-between"
            >
              <span className={selectedHotspot?.part?.name ? 'text-slate-900' : 'text-slate-500'}>
                {selectedHotspot?.part?.name || 'Select part...'}
              </span>
              <Settings className="h-3 w-3" />
            </button>

            {showPartSelector && (
              <div className="border border-slate-300 rounded bg-white shadow max-h-32 overflow-y-auto">
                {allParts.length === 0 ? (
                  <div className="p-2 text-xs text-slate-500 text-center">Loading parts...</div>
                ) : (
                  allParts.map(part => (
                    <button
                      key={part.id}
                      onClick={() => {
                        setSelectedHotspot({ ...selectedHotspot, part_id: part.id, part });
                        setShowPartSelector(false);
                      }}
                      className="w-full px-2 py-1 text-left hover:bg-blue-50 border-b text-xs transition-colors"
                    >
                      <p className="font-medium text-xs">{part.name}</p>
                      <p className="text-xs text-slate-500">{part.part_number}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hotspots List */}
      {(catalogData?.hotspots?.length || 0) > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Hotspots ({catalogData.hotspots.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {catalogData.hotspots.map(hotspot => (
                <button
                  key={hotspot.id}
                  onClick={() => setSelectedHotspot(hotspot)}
                  className={`w-full p-1 rounded text-left text-xs transition-all ${
                    selectedHotspot?.id === hotspot.id
                      ? 'bg-blue-100 border border-blue-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <p className="font-medium">{hotspot.part?.name || 'Unlabeled'}</p>
                  <p className="text-xs text-slate-600">{hotspot.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!catalogData?.diagram_url && !isAdmin && (
        <div className="text-center py-4 text-xs text-slate-500">
          <Eye className="h-5 w-5 mx-auto mb-2 text-slate-400" />
          <p>Read-only mode</p>
        </div>
      )}
    </div>
  );
};

export default MachineCatalogSidebar;
