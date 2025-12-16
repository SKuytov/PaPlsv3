import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Plus, Edit2, Trash2, ZoomIn, ZoomOut, Maximize,
  Package, AlertCircle, Settings, Eye, Lock, ChevronDown, ChevronRight,
  Copy, Download, Share2, Search, Filter, Calendar, Layers,
  FileText, Wrench, ListChecks, BarChart3, TrendingDown, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Advanced Interactive Canvas Component
const AdvancedInteractiveCanvas = ({
  imageUrl,
  hotspots,
  selectedHotspot,
  onHotspotClick,
  onHotspotAdd,
  editMode,
  zoom,
  brandColor,
  fitToScreen
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [tempRect, setTempRect] = useState(null);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

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
    if (!editMode || !isDrawing || !startPoint) {
      // Show hover effect
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
          setHoveredHotspot(hotspot.id);
          return;
        }
      }
      setHoveredHotspot(null);
      return;
    }

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

  const handleMouseUp = () => {
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
      ref={containerRef}
      className="relative bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        height: '500px',
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

      <svg className="absolute inset-0 w-full h-full pointer-events-none" ref={canvasRef}>
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Hotspots */}
        {hotspots.map((hotspot, idx) => (
          <g key={idx}>
            <rect
              x={hotspot.position_data.x}
              y={hotspot.position_data.y}
              width={hotspot.position_data.width}
              height={hotspot.position_data.height}
              fill={selectedHotspot?.id === hotspot.id ? brandColor : `${brandColor}40`}
              stroke={selectedHotspot?.id === hotspot.id ? '#3b82f6' : (hoveredHotspot === hotspot.id ? '#1e40af' : brandColor)}
              strokeWidth={selectedHotspot?.id === hotspot.id || hoveredHotspot === hotspot.id ? '3' : '2'}
              className="hover:opacity-75 transition-all"
              style={{ cursor: 'pointer' }}
            />
            {/* Hotspot Label */}
            <text
              x={hotspot.position_data.x + 5}
              y={hotspot.position_data.y + 15}
              fontSize="10"
              fill="#1e293b"
              fontWeight="600"
              className="pointer-events-none"
            >
              {hotspot.label}
            </text>
          </g>
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

      {editMode && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1">
          <Edit2 className="h-3 w-3" /> Edit Mode Active
        </div>
      )}
    </div>
  );
};

// Assembly Tree Component
const AssemblyTree = ({ assemblies, selectedAssembly, onSelectAssembly, editMode, onDeleteAssembly }) => {
  const [expanded, setExpanded] = useState({});

  const toggleExpanded = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {assemblies.map(assembly => (
        <div key={assembly.id} className="text-xs">
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
              selectedAssembly?.id === assembly.id
                ? 'bg-blue-100 border-l-4 border-blue-600'
                : 'hover:bg-slate-100'
            }`}
            onClick={() => onSelectAssembly(assembly)}
          >
            {assembly.sub_assemblies?.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(assembly.id);
                }}
                className="p-0.5 hover:bg-slate-200 rounded"
              >
                {expanded[assembly.id] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            <Layers className="h-3 w-3 text-slate-600" />
            <span className="font-medium flex-1">{assembly.name}</span>
            {editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAssembly(assembly.id);
                }}
                className="p-0.5 hover:bg-red-100 rounded text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          {expanded[assembly.id] && assembly.sub_assemblies?.length > 0 && (
            <div className="ml-4 space-y-1 border-l border-slate-200 pl-2">
              {assembly.sub_assemblies.map(subAsm => (
                <div
                  key={subAsm.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                  onClick={() => onSelectAssembly(subAsm)}
                >
                  <Package className="h-3 w-3 text-slate-500" />
                  <span className="text-xs">{subAsm.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Main Enhanced Catalog Component
const EnhancedMachineCatalog = ({ machineId, machineName, userRole }) => {
  const { toast } = useToast();
  const [catalogData, setCatalogData] = useState(null);
  const [assemblies, setAssemblies] = useState([]);
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('assemblies');
  const [zoom, setZoom] = useState(1);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [allParts, setAllParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const fileInputRef = useRef(null);

  const BRAND_COLOR = 'rgba(59, 130, 246, 0.2)';
  const isAdmin = ['God Admin', 'Technical Director', 'Head Technician'].includes(userRole);

  useEffect(() => {
    loadCatalogData();
    loadAssemblies();
  }, [machineId]);

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_parts_catalogs')
        .select(`
          *,
          hotspots:machine_hotspots(
            id, position_data, part_id, label, color,
            part:spare_parts(id, name, part_number, current_quantity, unit_of_measure, category, average_cost)
          )
        `)
        .eq('machine_id', machineId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCatalogData(data || null);
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssemblies = async () => {
    try {
      // Load assemblies with their hierarchy
      const { data, error } = await supabase
        .from('machine_assemblies')
        .select(`
          *,
          sub_assemblies:machine_sub_assemblies(
            id, name, description, parts:assembly_parts(id, part_id, quantity, spare_part:spare_parts(id, name, part_number, average_cost))
          ),
          parts:assembly_parts(id, part_id, quantity, spare_part:spare_parts(id, name, part_number, average_cost))
        `)
        .eq('machine_id', machineId)
        .order('position');

      if (!error && data) {
        setAssemblies(data);
        if (data.length > 0) setSelectedAssembly(data[0]);
      }
    } catch (err) {
      console.error('Error loading assemblies:', err);
    }
  };

  const loadAllParts = async () => {
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, name, part_number, current_quantity, unit_of_measure, category, average_cost')
        .order('name');
      if (!error) setAllParts(data || []);
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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('machine-diagrams')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('machine-diagrams')
        .getPublicUrl(fileName);

      const catalogPayload = {
        machine_id: machineId,
        diagram_url: urlData.publicUrl,
        diagram_name: file.name,
        is_active: true,
        updated_at: new Date().toISOString()
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

      toast({ title: 'Success', description: 'Diagram uploaded successfully' });
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

      toast({ title: 'Success', description: 'Hotspot added to diagram' });
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

  const calculateBOM = () => {
    if (!selectedAssembly?.parts) return [];
    return selectedAssembly.parts.map(ap => ({
      ...ap,
      totalCost: (ap.spare_part?.average_cost || 0) * (ap.quantity || 1)
    }));
  };

  const totalAssemblyCost = calculateBOM().reduce((sum, item) => sum + item.totalCost, 0);
  const filteredParts = allParts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner message="Loading catalog..." />;

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {machineName} Catalogue
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">Multi-level assembly system</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
                className={`${editMode ? 'bg-green-600 hover:bg-green-700' : ''} h-8`}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                {editMode ? 'Done' : 'Edit'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 px-4 pt-4 bg-slate-50 border-b">
          <TabsTrigger value="assemblies" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            Assemblies
          </TabsTrigger>
          <TabsTrigger value="diagram" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Diagram
          </TabsTrigger>
          <TabsTrigger value="bom" className="text-xs">
            <ListChecks className="h-3 w-3 mr-1" />
            BOM
          </TabsTrigger>
          <TabsTrigger value="specs" className="text-xs">
            <Wrench className="h-3 w-3 mr-1" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Assemblies Tab */}
        <TabsContent value="assemblies" className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Card>
              <CardContent className="pt-3 pb-2">
                <p className="text-slate-600">Total Assemblies</p>
                <p className="text-xl font-bold text-slate-900">{assemblies.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2">
                <p className="text-slate-600">Total Parts</p>
                <p className="text-xl font-bold text-slate-900">
                  {assemblies.reduce((sum, a) => sum + (a.parts?.length || 0), 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2">
                <p className="text-slate-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Value
                </p>
                <p className="text-xl font-bold text-slate-900">
                  €{(assemblies.reduce((sum, a) => {
                    return sum + (a.parts?.reduce((s, p) => s + ((p.spare_part?.average_cost || 0) * (p.quantity || 1)), 0) || 0);
                  }, 0)).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assembly Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <AssemblyTree
                assemblies={assemblies}
                selectedAssembly={selectedAssembly}
                onSelectAssembly={setSelectedAssembly}
                editMode={editMode && isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagram Tab */}
        <TabsContent value="diagram" className="flex-1 overflow-auto p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              disabled={zoom <= 0.5}
              className="h-8 px-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              disabled={zoom >= 2}
              className="h-8 px-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFitToScreen(!fitToScreen)}
              className="h-8 px-2"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {catalogData?.diagram_url ? (
            <AdvancedInteractiveCanvas
              imageUrl={catalogData.diagram_url}
              hotspots={catalogData.hotspots || []}
              selectedHotspot={selectedHotspot}
              onHotspotClick={setSelectedHotspot}
              onHotspotAdd={handleAddHotspot}
              editMode={editMode && isAdmin}
              zoom={zoom}
              brandColor={BRAND_COLOR}
              fitToScreen={fitToScreen}
            />
          ) : isAdmin ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-700">Upload Assembly Diagram</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, or SVG (max 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Lock className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p>No diagram available</p>
            </div>
          )}

          {selectedHotspot?.part && (
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Part Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3 text-xs">
                <div>
                  <p className="text-slate-600 font-semibold">Name</p>
                  <p className="font-medium">{selectedHotspot.part.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-600 font-semibold">Part #</p>
                    <p className="font-mono text-xs">{selectedHotspot.part.part_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Category</p>
                    <p>{selectedHotspot.part.category || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-600 font-semibold">Stock</p>
                    <Badge variant={selectedHotspot.part.current_quantity > 0 ? 'default' : 'destructive'}>
                      {selectedHotspot.part.current_quantity} {selectedHotspot.part.unit_of_measure}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Unit Cost</p>
                    <p className="font-bold">€{selectedHotspot.part.average_cost || '0'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                    className="w-full mt-2 h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Hotspot
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="flex-1 overflow-auto p-4 space-y-3">
          {selectedAssembly ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{selectedAssembly.name} - BOM</span>
                    <span className="text-lg font-bold text-blue-600">€{totalAssemblyCost.toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {calculateBOM().length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No parts in this assembly</p>
                    ) : (
                      calculateBOM().map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-200 hover:border-blue-300 transition-all">
                          <div className="flex-1">
                            <p className="font-semibold">{item.spare_part?.name}</p>
                            <p className="text-slate-600">{item.spare_part?.part_number}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-bold text-blue-600">Qty: {item.quantity}</p>
                            <p className="text-slate-600">€{item.totalCost.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-slate-500 text-xs py-8">Select an assembly to view BOM</p>
          )}
        </TabsContent>

        {/* Specs Tab */}
        <TabsContent value="specs" className="flex-1 overflow-auto p-4 space-y-3">
          {selectedAssembly ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{selectedAssembly.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <p className="text-slate-600 font-semibold mb-1">Description</p>
                    <p>{selectedAssembly.description || 'No description'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="pt-3">
                        <p className="text-slate-600 mb-1">Parts Count</p>
                        <p className="text-xl font-bold">{selectedAssembly.parts?.length || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-3">
                        <p className="text-slate-600 mb-1">Assembly Value</p>
                        <p className="text-xl font-bold">€{totalAssemblyCost.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-slate-500 text-xs py-8">Select an assembly to view specifications</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedMachineCatalog;
