import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Plus, Edit2, Trash2, Eye, Check, X, ZoomIn, ZoomOut,
  Package, AlertCircle, Settings, Copy, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
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
  zoom
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

      // Check if click is within any hotspot
      for (let hotspot of hotspots) {
        if (
          x >= hotspot.x &&
          x <= hotspot.x + hotspot.width &&
          y >= hotspot.y &&
          y <= hotspot.y + hotspot.height
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
      className="relative bg-slate-100 border-2 border-slate-300 rounded-lg overflow-hidden cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        maxWidth: '800px',
        height: '600px',
        transform: `scale(${zoom})`,
        transformOrigin: 'top left'
      }}
    >
      {/* Background Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Machine Diagram"
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}

      {/* Hotspots */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `scale(1)` // SVG handles its own scaling
        }}
      >
        {hotspots.map((hotspot, idx) => (
          <rect
            key={idx}
            x={hotspot.x}
            y={hotspot.y}
            width={hotspot.width}
            height={hotspot.height}
            fill={selectedHotspot?.id === hotspot.id ? 'rgba(59, 130, 246, 0.3)' : hotspot.color || 'rgba(59, 130, 246, 0.1)'}
            stroke={selectedHotspot?.id === hotspot.id ? '#3b82f6' : hotspot.borderColor || '#1e40af'}
            strokeWidth="2"
            className="hover:opacity-75 transition-opacity"
            style={{
              cursor: editMode ? 'crosshair' : 'pointer'
            }}
          />
        ))}

        {/* Temp Rectangle while drawing */}
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

      {/* Edit Mode Label */}
      {editMode && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded text-xs font-semibold">
          ✏️ Draw Mode
        </div>
      )}
    </div>
  );
};

// Main Catalog Component
const MachinePartsCatalog = ({ machineId, machineName }) => {
  const { toast } = useToast();
  const [catalogData, setCatalogData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [allParts, setAllParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  // Load catalog data
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
        description: 'Failed to load catalog data'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    setPartsLoading(true);
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, part_number, current_quantity, unit_of_measure, category')
        .order('name');

      if (error) throw error;
      setAllParts(data || []);
    } catch (err) {
      console.error('Error loading parts:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load spare parts'
      });
    } finally {
      setPartsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploadProgress(0);
      const fileName = `machine-${machineId}-${Date.now()}.${file.name.split('.').pop()}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('machine-diagrams')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('machine-diagrams')
        .getPublicUrl(fileName);

      // Create or update catalog
      const catalogPayload = {
        machine_id: machineId,
        diagram_url: urlData.publicUrl,
        diagram_name: file.name,
        is_active: true
      };

      let catalogId;
      if (catalogData) {
        const { data: updated, error: updateError } = await supabase
          .from('machine_parts_catalogs')
          .update(catalogPayload)
          .eq('machine_id', machineId)
          .select()
          .single();
        if (updateError) throw updateError;
        catalogId = updated.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from('machine_parts_catalogs')
          .insert(catalogPayload)
          .select()
          .single();
        if (createError) throw createError;
        catalogId = created.id;
      }

      setCatalogData(prev => ({
        ...prev || {},
        id: catalogId,
        machine_id: machineId,
        diagram_url: urlData.publicUrl,
        diagram_name: file.name,
        hotspots: []
      }));

      toast({
        title: 'Success',
        description: 'Diagram uploaded successfully'
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message
      });
    }
  };

  const handleAddHotspot = async (rect) => {
    if (!catalogData || !selectedHotspot?.part_id) {
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
          color: selectedHotspot.color || 'rgba(59, 130, 246, 0.2)'
        })
        .select()
        .single();

      if (error) throw error;

      setCatalogData(prev => ({
        ...prev,
        hotspots: [...(prev?.hotspots || []), data]
      }));

      toast({
        title: 'Success',
        description: 'Hotspot added successfully'
      });
    } catch (err) {
      console.error('Error adding hotspot:', err);
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
      toast({
        title: 'Deleted',
        description: 'Hotspot removed'
      });
    } catch (err) {
      console.error('Error deleting hotspot:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete hotspot'
      });
    }
  };

  if (loading) return <LoadingSpinner message="Loading catalog..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Parts Catalog</h2>
          <p className="text-sm text-slate-600 mt-1">{machineName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? 'default' : 'outline'}
            className={editMode ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {editMode ? 'Done Editing' : 'Edit Hotspots'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Machine Diagram</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    disabled={zoom >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {catalogData?.diagram_url ? (
                <div className="w-full overflow-auto border rounded-lg">
                  <InteractiveCanvas
                    imageUrl={catalogData.diagram_url}
                    hotspots={catalogData.hotspots || []}
                    selectedHotspot={selectedHotspot}
                    onHotspotClick={setSelectedHotspot}
                    onHotspotAdd={handleAddHotspot}
                    editMode={editMode}
                    zoom={zoom}
                  />
                </div>
              ) : (
                <div
                  className="w-full h-[500px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-slate-400 mb-3" />
                  <p className="text-slate-600 font-medium">Upload Machine Diagram</p>
                  <p className="text-xs text-slate-500 mt-1">Click to select JPG, PNG, or PDF</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          {editMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p><strong>Edit Mode:</strong> Draw rectangles on the diagram to create clickable hotspots. Each hotspot can be linked to a spare part.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Hotspot Details */}
          {selectedHotspot && (
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Part Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedHotspot.part ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold">Part Name</p>
                      <p className="text-sm font-medium text-slate-900">{selectedHotspot.part.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold">Part Number</p>
                      <p className="text-sm font-mono text-slate-700">{selectedHotspot.part.part_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold">Current Stock</p>
                      <p className="text-sm">
                        <Badge variant={selectedHotspot.part.current_quantity > 0 ? 'default' : 'destructive'}>
                          {selectedHotspot.part.current_quantity} {selectedHotspot.part.unit_of_measure}
                        </Badge>
                      </p>
                    </div>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Hotspot
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-600">No part linked to this hotspot</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Part Selector */}
          {editMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add New Hotspot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">Select Part</label>
                  <div
                    className="relative"
                    onClick={() => {
                      setShowPartSelector(!showPartSelector);
                      if (!partsLoading && allParts.length === 0) loadAllParts();
                    }}
                  >
                    <button className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-left flex items-center justify-between hover:bg-slate-50">
                      <span className={selectedHotspot?.part?.name ? 'text-slate-900' : 'text-slate-500'}>
                        {selectedHotspot?.part?.name || 'Select a part...'}
                      </span>
                      <Layers className="h-4 w-4 text-slate-400" />
                    </button>

                    {showPartSelector && (
                      <div className="absolute top-full left-0 right-0 mt-1 border border-slate-300 rounded-lg bg-white shadow-lg z-10 max-h-48 overflow-y-auto">
                        {partsLoading ? (
                          <div className="p-3 text-center text-sm text-slate-500">Loading...</div>
                        ) : allParts.length === 0 ? (
                          <div className="p-3 text-center text-sm text-slate-500">No parts available</div>
                        ) : (
                          allParts.map(part => (
                            <button
                              key={part.id}
                              onClick={() => {
                                setSelectedHotspot({ ...selectedHotspot, part_id: part.id, part });
                                setShowPartSelector(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b text-sm transition-colors"
                            >
                              <p className="font-medium text-slate-900">{part.name}</p>
                              <p className="text-xs text-slate-500">{part.part_number}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleAddHotspot(selectedHotspot)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hotspot
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Hotspots List */}
          {(catalogData?.hotspots?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hotspots ({catalogData.hotspots.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {catalogData.hotspots.map(hotspot => (
                    <button
                      key={hotspot.id}
                      onClick={() => setSelectedHotspot(hotspot)}
                      className={`w-full p-2 rounded-lg text-left transition-all text-sm ${
                        selectedHotspot?.id === hotspot.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-100 border border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{hotspot.part?.name || 'Unlabeled'}</p>
                      <p className="text-xs text-slate-600">{hotspot.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachinePartsCatalog;
