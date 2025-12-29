import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
   Camera, Keyboard, QrCode, History, AlertTriangle,
   CheckCircle, X, RefreshCw,
   MinusCircle, ArrowLeft, Info, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/customSupabaseClient';
import { playBeep } from '@/utils/barcodeScanner';
import ImageWithFallback from '@/components/common/ImageWithFallback';
import ErrorBoundary from '@/components/ErrorBoundary';
import PartDetailsModal from '@/components/modules/spare-parts/PartDetailsModal';
import { useAuth } from '@/contexts/AuthContext';

// Same optimization constants as Scanner
const CACHE_DURATION_MS = 30000; // 30 seconds
const DEBOUNCE_DELAY_MS = 500;
const MAX_BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const HID_SCAN_TIMEOUT_MS = 300; // 300ms timeout for complete HID scan

const MaintenanceScanner = ({ onLogout, technicianName, technicianId }) => {
   const { toast } = useToast();
   const { user } = useAuth();
   
   // DEBUG LOGGING
   console.log('[MaintenanceScanner] Component mounted');
   
   // --- State Management ---
   const [mode, setMode] = useState('hid'); // 'hid' | 'camera' | 'manual' (default: hid)
   const [scanStep, setScanStep] = useState('scan'); // 'scan' | 'menu' | 'transaction'
   const [loading, setLoading] = useState(false);
   const [cameraError, setCameraError] = useState(null);
   const [recentScans, setRecentScans] = useState([]);
   const [activePart, setActivePart] = useState(null);
   const [showHistory, setShowHistory] = useState(false);
   
   // --- Refs for Logic Control ---
   const scanActiveRef = useRef(true); 
   const zxingReaderRef = useRef(null);
   const videoRef = useRef(null);
   const manualInputRef = useRef(null);
   
   // Optimization: Queue and Cache Refs
   const scanQueueRef = useRef([]);
   const queryInProgressRef = useRef(false);
   const scanCacheRef = useRef(new Map());
   const debounceTimerRef = useRef(null);
   const queryCounterRef = useRef(0);
   
   // HID Scanner Refs
   const hidBufferRef = useRef('');
   const hidTimeoutRef = useRef(null);
   const handleScanRef = useRef(null); // Store handleScan in ref to avoid circular dependency
   const hidActiveFlagRef = useRef(false); // Track if HID is actively listening

   // Transaction Form State - TECHNICIAN: ONLY USAGE
   const [txQty, setTxQty] = useState(1);
   const [txMachineId, setTxMachineId] = useState('none');
   const [txNotes, setTxNotes] = useState('');
   const [machines, setMachines] = useState([]);
   const [detailsModalOpen, setDetailsModalOpen] = useState(false);

   // Determine which user ID to use for performed_by
   const performedByUserId = technicianId || user?.id;

   // Fetch Machines for dropdown
   useEffect(() => {
      const fetchMachines = async () => {
         const { data } = await supabase.from('machines').select('id, name, machine_code').order('name');
         if (data) setMachines(data);
      };
      fetchMachines();
   }, []);

   // --- OPTIMIZED SCAN LOGIC (Same as main Scanner) ---

   const getCachedPart = (barcode) => {
      const cached = scanCacheRef.current.get(barcode);
      if (!cached) return null;
      
      const isExpired = (Date.now() - cached.timestamp) > CACHE_DURATION_MS;
      if (isExpired) {
         scanCacheRef.current.delete(barcode);
         return null;
      }
      
      console.log(`[MaintenanceScanner] Cache HIT for ${barcode}`);
      return cached.data;
   };

   const cachePart = (barcode, data) => {
      scanCacheRef.current.set(barcode, {
         data,
         timestamp: Date.now()
      });
   };

   const fetchWithRetry = async (barcode, attempt = 1) => {
       try {
           queryCounterRef.current += 1;
           console.log(`[MaintenanceScanner] Executing Query #${queryCounterRef.current} for: ${barcode} (Attempt ${attempt})`);
           
           const { data: parts, error } = await supabase
            .from('spare_parts')
            .select(`
               *,
               part_supplier_options (
                  supplier:suppliers (id, name, email, phone)
               ),
               warehouse:warehouses(name)
            `)
            .eq('barcode', barcode);

           if (error) throw error;
           console.log(`[MaintenanceScanner] Query returned ${parts?.length || 0} parts`);
           return parts;
       } catch (error) {
           console.error(`[MaintenanceScanner] Query error: ${error.message}`);
           if (attempt < MAX_RETRIES) {
               const delay = 2000 * Math.pow(2, attempt - 1);
               console.log(`[MaintenanceScanner] Retrying in ${delay}ms...`);
               await new Promise(resolve => setTimeout(resolve, delay));
               return fetchWithRetry(barcode, attempt + 1);
           }
           throw error;
       }
   };

   const processBarcode = async (code, source) => {
      console.log(`[MaintenanceScanner] Processing barcode: ${code} from ${source}`);
      let part = getCachedPart(code);

      try {
          if (!part) {
              console.log(`[MaintenanceScanner] Fetching from database...`);
              const parts = await fetchWithRetry(code);
              
              if (parts && parts.length > 0) {
                  parts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                  part = parts[0];
                  console.log(`[MaintenanceScanner] Found part: ${part.name}`);
                  cachePart(code, part);
              }
          }

          if (!part) {
              console.warn(`[MaintenanceScanner] Part not found for barcode: ${code}`);
              playBeep('error');
              toast({
                  title: "Part Not Found",
                  description: `No part found with barcode: ${code}`,
                  variant: "destructive",
              });
              // Unlock for next scan
              setTimeout(() => {
                  console.log('[MaintenanceScanner] Unlocking scanner after error');
                  scanActiveRef.current = true;
                  setLoading(false);
               }, 2000);
               return;
          }

          // SUCCESS: Part found
          console.log(`[MaintenanceScanner] Part found successfully: ${part.name} (ID: ${part.id})`);
          const scanData = {
              barcode: code,
              part,
              timestamp: new Date().toISOString(),
              source
          };

          console.log(`[MaintenanceScanner] Setting activePart and moving to menu step`);
          setRecentScans(prev => [scanData, ...prev].slice(0, 10));
          setActivePart(scanData);
          setScanStep('menu'); // This should trigger the menu UI
          
          setTxQty(1);
          setTxNotes('');
          setTxMachineId('none');
          setLoading(false);
          console.log('[MaintenanceScanner] Menu step activated, waiting for user action');

      } catch (error) {
          console.error('[MaintenanceScanner] Processing Error:', error);
          playBeep('error');
          toast({ title: "Error", description: "Failed to process scan", variant: "destructive" });
          setTimeout(() => {
              console.log('[MaintenanceScanner] Unlocking scanner after exception');
              scanActiveRef.current = true;
              setLoading(false);
          }, 2000);
      }
   };

   const processQueue = async () => {
       console.log(`[MaintenanceScanner] processQueue called, queue length: ${scanQueueRef.current.length}, in progress: ${queryInProgressRef.current}`);
       if (queryInProgressRef.current || scanQueueRef.current.length === 0) {
           console.log('[MaintenanceScanner] processQueue skipped (already in progress or empty queue)');
           return;
       }
       
       queryInProgressRef.current = true;
       setLoading(true);

       const currentBatch = [...scanQueueRef.current];
       scanQueueRef.current = [];
       console.log(`[MaintenanceScanner] Processing batch of ${currentBatch.length} items`);

       for (const item of currentBatch) {
           console.log(`[MaintenanceScanner] Processing item: ${item.code}`);
           if (scanStep !== 'scan') {
               console.log('[MaintenanceScanner] Not in scan mode, skipping batch item');
               continue; 
           }
           await processBarcode(item.code, item.source);
           if (scanStep === 'menu') {
               console.log('[MaintenanceScanner] Menu activated, stopping batch processing');
               break;
           }
       }

       queryInProgressRef.current = false;
       console.log(`[MaintenanceScanner] Batch processing complete, remaining queue: ${scanQueueRef.current.length}`);
       
       if (scanQueueRef.current.length > 0) {
           console.log('[MaintenanceScanner] Queue has more items, reprocessing');
           processQueue();
       } else {
            if (scanStep === 'scan') {
                console.log('[MaintenanceScanner] All done, disabling loading');
                setLoading(false);
            } else {
                console.log('[MaintenanceScanner] Still in menu/transaction, keeping loading state');
            }
       }
   };

   const handleScan = (code, source = 'hid') => {
      console.log(`[MaintenanceScanner] handleScan called: ${code} from ${source}, scanActive: ${scanActiveRef.current}`);
      
      if (!scanActiveRef.current) {
          console.warn(`[MaintenanceScanner] Scan blocked - scanner not active`);
          return;
      }
      
      console.log(`[MaintenanceScanner] Received: ${code} from ${source}`);
      playBeep('success');
      scanActiveRef.current = false; // Lock immediately
      console.log('[MaintenanceScanner] Scanner locked');

      scanQueueRef.current.push({ code, source });
      console.log(`[MaintenanceScanner] Added to queue, queue length: ${scanQueueRef.current.length}`);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const shouldFlushImmediately = scanQueueRef.current.length >= MAX_BATCH_SIZE;

      if (shouldFlushImmediately) {
          console.log('[MaintenanceScanner] Max batch size reached, processing immediately');
          processQueue();
      } else {
          console.log('[MaintenanceScanner] Setting debounce timer for 500ms');
          debounceTimerRef.current = setTimeout(() => {
              console.log('[MaintenanceScanner] Debounce timer fired, processing queue');
              processQueue();
          }, DEBOUNCE_DELAY_MS);
      }
   };

   // Update ref whenever handleScan changes (needed for HID listener)
   useEffect(() => {
      handleScanRef.current = handleScan;
   }, [handleScan]);

   // --- HID SCANNER SETUP (Always listening) ---
   useEffect(() => {
      console.log(`[MaintenanceScanner] HID useEffect setup: scanStep=${scanStep}, mode=${mode}`);
      
      const handleKeyDown = (event) => {
         // Only capture HID input when in scan mode and HID mode is active
         if (scanStep !== 'scan' || mode !== 'hid' || !hidActiveFlagRef.current) {
            console.log(`[MaintenanceScanner] HID event ignored: scanStep=${scanStep}, mode=${mode}, hidActive=${hidActiveFlagRef.current}`);
            return;
         }

         // 🔒 CRITICAL: Block ALL modifier key combinations to prevent browser shortcuts
         if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
            console.log(`[MaintenanceScanner] Blocking modifier key: ctrl=${event.ctrlKey}, alt=${event.altKey}, meta=${event.metaKey}, shift=${event.shiftKey}`);
            event.preventDefault();
            return;
         }

         // Ignore special keys that shouldn't be in barcode
         if (['Escape', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(event.key)) {
            console.log(`[MaintenanceScanner] Ignoring special key: ${event.key}`);
            return;
         }

         event.preventDefault();

         // Enter key triggers the scan
         if (event.key === 'Enter') {
            console.log(`[MaintenanceScanner] Enter key pressed, buffer: "${hidBufferRef.current}"`);
            if (hidBufferRef.current.length > 0) {
               console.log(`[MaintenanceScanner] Calling handleScan with: ${hidBufferRef.current}`);
               handleScanRef.current(hidBufferRef.current, 'hid');
               hidBufferRef.current = '';
            }
            return;
         }

         // Build up the barcode buffer
         hidBufferRef.current += event.key;
         console.log(`[MaintenanceScanner] HID buffer: "${hidBufferRef.current}"`);

         // Clear timeout and restart it
         if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
         hidTimeoutRef.current = setTimeout(() => {
            console.log(`[MaintenanceScanner] HID timeout fired, buffer: "${hidBufferRef.current}"`);
            // If we have accumulated text without Enter, still process it
            if (hidBufferRef.current.length > 2) {
               console.log(`[MaintenanceScanner] Calling handleScan from timeout with: ${hidBufferRef.current}`);
               handleScanRef.current(hidBufferRef.current, 'hid');
               hidBufferRef.current = '';
            } else {
               hidBufferRef.current = '';
            }
         }, HID_SCAN_TIMEOUT_MS);
      };

      // Set flag when entering HID mode
      if (scanStep === 'scan' && mode === 'hid') {
         console.log('[MaintenanceScanner] Activating HID listener');
         hidActiveFlagRef.current = true;
         window.addEventListener('keydown', handleKeyDown, true); // Use capture phase for priority
         return () => {
            console.log('[MaintenanceScanner] Deactivating HID listener');
            hidActiveFlagRef.current = false;
            window.removeEventListener('keydown', handleKeyDown, true);
            if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
         };
      } else {
         console.log('[MaintenanceScanner] Not setting up HID listener');
         hidActiveFlagRef.current = false;
      }
   }, [scanStep, mode]);

   const handleTransaction = async () => {
      if (!activePart) return;
      if (txQty <= 0) {
         toast({ variant: "destructive", title: "Invalid Quantity", description: "Quantity must be greater than 0" });
         return;
      }
      
      if (!performedByUserId) {
         console.error('[MaintenanceScanner] No performedByUserId available!');
         toast({ variant: "destructive", title: "Error", description: "No technician logged in" });
         return;
      }
      
      console.log('[MaintenanceScanner] Creating transaction with performed_by:', performedByUserId);
      
      setLoading(true);
      try {
         // TECHNICIAN: Always USAGE (negative quantity)
         const quantityChange = -Math.abs(txQty);
         
         if (activePart.part.current_quantity + quantityChange < 0) {
            toast({ 
               variant: "destructive", 
               title: "Insufficient Stock", 
               description: `Current stock is ${activePart.part.current_quantity}. Cannot use ${txQty}.` 
            });
            setLoading(false);
            return;
         }

         // Insert transaction - ALWAYS "usage" type with technician ID
         const txData = {
            part_id: activePart.part.id,
            machine_id: txMachineId === 'none' ? null : txMachineId,
            transaction_type: 'usage', // TECHNICIAN: ALWAYS USAGE
            quantity: quantityChange,
            unit_cost: activePart.part.average_cost || 0,
            notes: txNotes,
            performed_by: performedByUserId,
            performed_by_role: 'technician' // Track that this was a technician
         };
         
         console.log('[MaintenanceScanner] Transaction data:', txData);
         
         const { error: txError } = await supabase.from('inventory_transactions').insert(txData);

         if (txError) throw txError;

         // Update part quantity
         const { error: updateError } = await supabase.from('spare_parts')
            .update({ current_quantity: activePart.part.current_quantity + quantityChange })
            .eq('id', activePart.part.id);

         if (updateError) throw updateError;

         playBeep('success');
         toast({ title: "Success", description: `Used ${txQty} x ${activePart.part.name}` });
         
         // Invalidate cache
         scanCacheRef.current.delete(activePart.barcode);
         
         resetScanner();

      } catch (error) {
         console.error('Transaction error:', error);
         toast({ variant: "destructive", title: "Transaction Failed", description: error.message });
      } finally {
         setLoading(false);
      }
   };

   const safeStopVideoTracks = () => {
      if (videoRef.current && videoRef.current.srcObject) {
         try {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
         } catch (e) {
            console.error('[MaintenanceScanner] Error stopping video tracks:', e);
         }
      }
   };

   const resetScanner = () => {
      console.log('[MaintenanceScanner] Resetting scanner');
      scanActiveRef.current = false;
      
      if (zxingReaderRef.current) {
         try {
            if (typeof zxingReaderRef.current.reset === 'function') {
               zxingReaderRef.current.reset();
            }
         } catch(e) { console.error(e); }
         zxingReaderRef.current = null;
      }

      safeStopVideoTracks();
      
      setActivePart(null);
      setDetailsModalOpen(false);
      setLoading(false);
      setScanStep('scan');
      scanActiveRef.current = true; // Unlock for next scan
      console.log('[MaintenanceScanner] Scanner reset complete, ready for next scan');
   };

   // --- CAMERA LIFECYCLE ---
   useEffect(() => {
      let reader = null;
      let mounted = true;
      
      const startCamera = async () => {
         if (scanStep !== 'scan' || mode !== 'camera') return;
         await new Promise(r => setTimeout(r, 300));
         
         if (!mounted || scanStep !== 'scan' || mode !== 'camera') return;
         if (!videoRef.current) return;

         scanActiveRef.current = true;

         try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            reader = new BrowserMultiFormatReader();
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
               { video: { facingMode: { ideal: "environment" } } },
               videoRef.current,
               (result, error) => {
                  if (!mounted || scanStep !== 'scan' || mode !== 'camera') return;
                  if (result) {
                     const text = result.getText();
                     handleScan(text, 'camera');
                  }
               }
            );
            
            setCameraError(null);
         } catch (err) {
            console.error("[Camera] Init Error:", err);
            if (mounted) {
               setCameraError("Could not access camera. Please check permissions.");
            }
         }
      };

      const stopCamera = () => {
         scanActiveRef.current = false;
         if (zxingReaderRef.current) {
            try {
               if (typeof zxingReaderRef.current.reset === 'function') {
                  zxingReaderRef.current.reset();
               }
            } catch(e) { console.warn('[Camera] Error resetting reader:', e); }
            zxingReaderRef.current = null;
         }
         safeStopVideoTracks();
      };

      if (scanStep === 'scan' && mode === 'camera') {
         startCamera();
      } else {
         stopCamera();
      }

      return () => {
         mounted = false;
         stopCamera();
      };
   }, [scanStep, mode, handleScan]);

   const handleManualSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const val = formData.get('manualBarcode') || '';
      
      if (val.trim()) {
         handleScan(val.trim(), 'manual');
         e.currentTarget.reset();
         // Re-focus for continuous scanning
         if (manualInputRef.current) {
            manualInputRef.current.focus();
         }
      }
   };

   // --- UI COMPONENTS ---
   const PartSummary = ({ part }) => (
      <div className="flex gap-4 bg-slate-50 p-4 rounded-lg border mb-4">
         <div className="w-16 h-16 bg-white rounded-md border overflow-hidden shrink-0">
            <ImageWithFallback src={part.photo_url} alt={part.name} className="w-full h-full object-cover" />
         </div>
         <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 truncate">{part.name}</h4>
            <p className="text-xs text-slate-500 font-mono mb-1">{part.part_number}</p>
            <Badge variant={part.current_quantity <= part.min_stock_level ? "destructive" : "outline"} className="text-[10px] h-5">
               Stock: {part.current_quantity} {part.unit_of_measure}
            </Badge>
         </div>
      </div>
   );

   return (
      <ErrorBoundary>
         <Card className="w-full max-w-2xl mx-auto shadow-lg border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-teal-50 border-b py-4 flex flex-row items-center justify-between">
               <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-teal-600" />
                  <div>
                     <CardTitle className="text-slate-800 text-lg">
                        {scanStep === 'scan' ? 'Technician Scanner' : scanStep === 'menu' ? 'Item Menu' : 'Register Usage'}
                     </CardTitle>
                     <p className="text-xs text-slate-500 mt-0.5">Logged in as: <span className="font-semibold text-slate-700">{technicianName}</span></p>
                  </div>
               </div>
               <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onLogout}
               >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
               </Button>
            </CardHeader>

            <CardContent className="p-4">
               
               {/* DEBUG: Show current state */}
               <div className="text-xs text-slate-500 mb-4 p-2 bg-slate-50 rounded border border-dashed">
                  <p>scanStep: {scanStep} | mode: {mode} | activePart: {activePart?.part?.name || 'none'} | scanActive: {scanActiveRef.current ? 'true' : 'false'}</p>
               </div>
               
               {/* STEP 1: SCANNING */}
               {scanStep === 'scan' && (
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                     <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="hid" className="flex items-center gap-1 text-xs md:text-sm"><QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Scanner</span></TabsTrigger>
                        <TabsTrigger value="camera" className="flex items-center gap-1 text-xs md:text-sm"><Camera className="w-4 h-4" /> <span className="hidden sm:inline">Camera</span></TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-1 text-xs md:text-sm"><Keyboard className="w-4 h-4" /> <span className="hidden sm:inline">Manual</span></TabsTrigger>
                     </TabsList>

                     {/* HID Scanner Tab (Default) */}
                     <TabsContent value="hid" className="mt-0">
                        <div className="space-y-4 p-8 bg-slate-50 rounded-lg border border-slate-200">
                           <div className="text-center space-y-2">
                              <p className="text-sm text-slate-600 font-medium">External Barcode Scanner Ready</p>
                              <p className="text-xs text-slate-500">Point your handheld scanner at the barcode</p>
                           </div>
                           <div className="bg-white p-4 rounded border-2 border-dashed border-teal-300 text-center">
                              <p className="text-xs text-slate-500 font-mono">Waiting for scan...</p>
                           </div>
                           {/* Hidden input to capture HID events */}
                           <Input 
                              type="text"
                              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                              tabIndex="-1"
                           />
                        </div>
                     </TabsContent>

                     {/* Camera Tab */}
                     <TabsContent value="camera" className="space-y-4 mt-0">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-inner ring-1 ring-black/10">
                           {cameraError ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center bg-slate-900">
                                 <AlertTriangle className="w-12 h-12 mb-2 text-yellow-500" />
                                 <p className="text-sm mb-4">{cameraError}</p>
                                 <Button onClick={() => setMode('manual')} variant="secondary" size="sm">
                                    Use Manual Entry
                                 </Button>
                              </div>
                           ) : (
                              <>
                                 <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                                 <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                                    <div className="w-full h-full border-2 border-white/50 relative">
                                       <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal-500"></div>
                                       <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal-500"></div>
                                       <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal-500"></div>
                                       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal-500"></div>
                                    </div>
                                 </div>
                                 <div className="absolute bottom-4 left-0 right-0 text-center">
                                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white">
                                         Point camera at barcode
                                     </span>
                                 </div>
                              </>
                           )}
                        </div>
                     </TabsContent>

                     {/* Manual Entry Tab */}
                     <TabsContent value="manual" className="mt-0">
                        <form onSubmit={handleManualSubmit} className="space-y-4 p-8 bg-slate-50 rounded-lg border border-slate-200">
                           <div className="flex flex-col items-center">
                              <Label htmlFor="manual-barcode" className="text-center block text-lg mb-4">Enter Barcode</Label>
                              <div className="w-full max-w-xs space-y-3">
                                 <Input
                                    ref={manualInputRef}
                                    name="manualBarcode"
                                    id="manual-barcode"
                                    type="text"
                                    placeholder="Type code & press enter..."
                                    className="text-center text-lg h-12 font-mono"
                                    autoFocus
                                    autoComplete="off"
                                 />
                                 <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {loading ? "Looking up..." : "Look Up"}
                                 </Button>
                              </div>
                           </div>
                        </form>
                     </TabsContent>
                  </Tabs>
               )}

               {/* STEP 2: ACTION MENU - TECHNICIAN: USE ONLY (NO RESTOCK) */}
               {scanStep === 'menu' && activePart && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                     <PartSummary part={activePart.part} />
                     
                     <div className="grid grid-cols-1 gap-3 mb-4">
                        <Button 
                           size="lg" 
                           className="h-16 text-lg font-semibold bg-red-600 hover:bg-red-700 shadow-sm"
                           onClick={() => {
                              setScanStep('transaction');
                           }}
                        >
                           <MinusCircle className="w-6 h-6 mr-3" />
                           Use Item
                        </Button>
                        <Button 
                           size="lg" 
                           variant="outline"
                           className="h-16 text-lg font-semibold border-2 hover:bg-slate-50"
                           onClick={() => setDetailsModalOpen(true)}
                        >
                           <Info className="w-6 h-6 mr-3 text-blue-600" />
                           View Details
                        </Button>
                     </div>

                     <Button variant="secondary" size="lg" className="w-full font-bold" onClick={resetScanner}>
                        <X className="w-5 h-5 mr-2" /> Cancel / Scan Next
                     </Button>
                  </div>
               )}

               {/* STEP 3: TRANSACTION FORM - USAGE ONLY */}
               {scanStep === 'transaction' && activePart && (
                  <div className="animate-in slide-in-from-right-4 duration-200">
                     <div className="flex items-center mb-4">
                        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setScanStep('menu')}>
                           <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <h3 className="ml-auto font-semibold text-lg text-slate-700">
                           Register Usage
                        </h3>
                     </div>

                     <PartSummary part={activePart.part} />

                     <div className="space-y-5 bg-white p-1">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Quantity to Use</Label>
                              <Input 
                                 type="number" 
                                 min="1"
                                 value={txQty}
                                 onChange={(e) => setTxQty(parseInt(e.target.value) || 0)}
                                 className="font-bold text-xl h-12 text-center"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label>Machine</Label>
                              <Select value={txMachineId} onValueChange={setTxMachineId}>
                                 <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select..." />
                                 </SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="none">-- General --</SelectItem>
                                    {machines.map(m => (
                                       <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label>Reason / Notes</Label>
                           <Textarea 
                              placeholder="Why is this item being used?"
                              value={txNotes}
                              onChange={(e) => setTxNotes(e.target.value)}
                              className="resize-none h-24 text-base"
                           />
                        </div>

                        <Button 
                           className="w-full h-14 text-lg font-bold shadow-md bg-red-600 hover:bg-red-700"
                           onClick={handleTransaction}
                           disabled={loading}
                        >
                           {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                           Confirm Usage
                        </Button>
                     </div>
                  </div>
               )}

               {/* Recent Scans History */}
               {scanStep === 'scan' && recentScans.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-slate-500"
                     >
                        <span className="flex items-center gap-2">
                           <History className="w-4 h-4" />
                           Recent Activity
                        </span>
                        <span>{showHistory ? 'Hide' : 'Show'}</span>
                     </Button>

                     {showHistory && (
                        <div className="mt-2 space-y-2">
                           {recentScans.map((scan, index) => (
                              <div key={index} className="flex justify-between text-sm p-2 bg-slate-50 rounded border">
                                 <span className="font-medium truncate flex-1 pr-2">{scan.part.name}</span>
                                 <span className="text-slate-400 text-xs font-mono pt-0.5">
                                    {new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                 </span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </CardContent>
         </Card>

         {/* Full Details Modal */}
         {activePart && (
             <PartDetailsModal 
                 open={detailsModalOpen}
                 part={activePart.part} 
                 onClose={() => setDetailsModalOpen(false)}
                 onDeleteRequest={() => {}}
                 onEditRequest={() => {}}
             />
         )}

      </ErrorBoundary>
   );
};

export default MaintenanceScanner;