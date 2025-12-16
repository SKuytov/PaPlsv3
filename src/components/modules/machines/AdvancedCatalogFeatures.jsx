import React, { useState, useRef } from 'react';
import {
  Download, Upload, Copy, RefreshCw, MoreVertical, Palette, Ruler,
  FileJson, AlertCircle, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import catalogService from '@/lib/catalog-service';

/**
 * Export Catalog to JSON
 */
export const ExportCatalogDialog = ({ catalogId, catalogName, onExport }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await catalogService.exportCatalog(catalogId);
      if (error) throw error;

      // Convert to JSON and download
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalog-${catalogName}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Catalog exported as JSON file'
      });
      setIsOpen(false);
      onExport?.();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Catalog</DialogTitle>
          <DialogDescription>
            Download this catalog as a JSON file. You can import it to another machine later.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            The exported file will include all hotspots and their linked spare parts.
            Image URLs are preserved for easy sharing.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Import Catalog from JSON
 */
export const ImportCatalogDialog = ({ machineId, machineName, onImport }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const fileContent = await selectedFile.text();
      const catalogData = JSON.parse(fileContent);

      const { data, error } = await catalogService.importCatalog(machineId, catalogData);
      if (error) throw error;

      toast({
        title: 'Import Successful',
        description: `Catalog with ${catalogData.hotspots?.length || 0} hotspots imported`
      });
      setIsOpen(false);
      setSelectedFile(null);
      onImport?.();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Import
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Catalog</DialogTitle>
          <DialogDescription>
            Select a previously exported catalog JSON file to import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <FileJson className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-900">
              {selectedFile ? selectedFile.name : 'Select JSON file'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Importing will create a new catalog. All spare parts must already exist in your system.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !selectedFile}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Color Picker for Hotspots
 */
export const HotspotColorPicker = ({ currentColor, onChange }) => {
  const colors = [
    { name: 'Blue', value: 'rgba(59, 130, 246, 0.2)' },
    { name: 'Red', value: 'rgba(239, 68, 68, 0.2)' },
    { name: 'Green', value: 'rgba(34, 197, 94, 0.2)' },
    { name: 'Yellow', value: 'rgba(234, 179, 8, 0.2)' },
    { name: 'Purple', value: 'rgba(147, 51, 234, 0.2)' },
    { name: 'Pink', value: 'rgba(236, 72, 153, 0.2)' },
    { name: 'Cyan', value: 'rgba(6, 182, 212, 0.2)' },
    { name: 'Orange', value: 'rgba(249, 115, 22, 0.2)' }
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map(color => (
        <button
          key={color.name}
          onClick={() => onChange(color.value)}
          className={`w-8 h-8 rounded border-2 transition-all ${
            currentColor === color.value
              ? 'border-slate-900 scale-110'
              : 'border-slate-300 hover:border-slate-500'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
};

/**
 * Hotspot Statistics
 */
export const CatalogStatistics = ({ catalogId, catalogData }) => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    loadStats();
  }, [catalogId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await catalogService.getCatalogStats(catalogId);
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Catalog Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Total Hotspots</p>
          <Badge className="text-base">{stats.totalHotspots}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Total Parts</p>
          <Badge variant="outline" className="text-base">
            {catalogData?.hotspots?.length || 0}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Stock Value</p>
          <Badge variant="secondary">{stats.totalStockValue}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Catalog Actions Menu
 */
export const CatalogActionsMenu = ({ catalogId, catalogName, machineId, onRefresh }) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDuplicate = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Catalog duplication will be available soon'
    });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this catalog and all its hotspots?')) {
      setIsDeleting(true);
      try {
        const { error } = await catalogService.deleteCatalog(catalogId);
        if (error) throw error;

        toast({
          title: 'Deleted',
          description: 'Catalog removed successfully'
        });
        onRefresh?.();
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete catalog'
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 focus:text-red-600"
        >
          <X className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Batch Import Multiple Catalogs
 */
export const BatchImportDialog = ({ machineIds, onImportComplete }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [selectedFiles, setSelectedFiles] = React.useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleBatchImport = async () => {
    if (selectedFiles.length === 0) return;

    setIsImporting(true);
    try {
      let successCount = 0;
      for (let i = 0; i < selectedFiles.length && i < machineIds.length; i++) {
        const file = selectedFiles[i];
        const machineId = machineIds[i];
        const fileContent = await file.text();
        const catalogData = JSON.parse(fileContent);

        const { error } = await catalogService.importCatalog(machineId, catalogData);
        if (!error) successCount++;
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} of ${selectedFiles.length} catalogs`
      });
      setIsOpen(false);
      setSelectedFiles([]);
      onImportComplete?.();
    } catch (error) {
      console.error('Batch import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Batch Import
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Import Catalogs</DialogTitle>
          <DialogDescription>
            Import multiple catalogs at once. Select JSON files matching your machines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-900">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} files selected`
                : 'Select JSON files'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBatchImport}
            disabled={isImporting || selectedFiles.length === 0}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default {
  ExportCatalogDialog,
  ImportCatalogDialog,
  HotspotColorPicker,
  CatalogStatistics,
  CatalogActionsMenu,
  BatchImportDialog
};
