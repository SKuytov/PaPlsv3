import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
   Camera, Keyboard, QrCode, History, AlertTriangle,
   CheckCircle, X, RefreshCw,
   MinusCircle, PlusCircle, ArrowLeft, Info
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

// OPTIMIZATION: Cache configuration
const CACHE_DURATION_MS = 30000; // 30 seconds
const DEBOUNCE_DELAY_MS = 500; // 0.5 seconds batch window
const MAX_BATCH_SIZE = 5; // Query after 5 accumulated scans
const MAX_RETRIES = 3;
const HID_SCAN_TIMEOUT_MS = 300; // 300ms timeout for complete HID scan

const Scanner = ({
   onScanComplete,
   selectedMachineId,
   batchMode = false,
   onBatchAdd,
   technicianId // NEW: RFID technician ID
}) => {
   const { toast } = useToast();
   const { user } = useAuth();
   
   // --- State Management ---
   const [mode, setMode] = useState('camera'); // 'camera' | 'hid' | 'manual'
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
   
   // OPTIMIZATION: Queue and Cache Refs
   const scanQueueRef = useRef([]);
   const queryInProgressRef = useRef(false);
   const scanCacheRef = useRef(new Map()); // Map<barcode, { data, timestamp }>
   const debounceTimerRef = useRef(null);
   const queryCounterRef = useRef(0);
   
   // HID Scanner Refs
   const hidBufferRef = useRef('');
   const hidTimeoutRef = useRef(null);
   const handleScanRef = useRef(null); // Store handleScan in ref to avoid circular dependency
   const hidActiveFlagRef = useRef(false); // Track if HID is actively listening

   // Transaction Form State
   const [txType, setTxType] = useState('usage');
   const [txQty, setTxQty] = useState(1);
   const [txMachineId, setTxMachineId] = useState(selectedMachineId || 'none');
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

   // Update machine selection if prop changes
   useEffect(() => {
      if (selectedMachineId) setTxMachineId(selectedMachineId);
   }, [selectedMachineId]);

   // --- OPTIMIZED SCAN LOGIC ---

   // Helper: Check Cache
   const getCachedPart = (barcode) => {
      const cached = scanCacheRef.current.get(barcode);
      if (!cached) return null;
      
      const isExpired = (Date.now() - cached.timestamp) > CACHE_DURATION_MS;
      if (isExpired) {
         scanCacheRef.current.delete(barcode);
         return null;
      }
      
      console.log(`[Scanner] Cache HIT for ${barcode}`);
      return cached.data;
   };

   // Helper: Add to Cache
   const cachePart = (barcode, data) => {
      scanCacheRef.current.set(barcode, {
         data,
         timestamp: Date.now()
      });
   };

   // Helper: Exponential Backoff Retry Wrapper
   const fetchWithRetry = async (barcode, attempt = 1) => {
       try {
           queryCounterRef.current += 1;
           console.log(`[Scanner] Executing Query #${queryCounterRef.current} for: ${barcode} (Attempt ${attempt})`);

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
           return parts;

       } catch (error) {
           if (attempt < MAX_RETRIES) {
               const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
               console.warn(`[Scanner] Query failed for ${barcode}, retrying in ${delay}ms...`);
               await new Promise(resolve => setTimeout(resolve, delay));
               return fetchWithRetry(barcode, attempt + 1);
           }
           throw error;
       }
   };

   // Core Processor for a single barcode (from queue)
   const processBarcode = async (code, source) => {
      // 1. Check Cache First
      let part = getCachedPart(code);

      try {
          // 2. If not in cache, fetch from DB
          if (!part) {
              const parts = await fetchWithRetry(code);
              
              if (parts && parts.length > 0) {
                  // If multiple duplicate barcodes exist, take the most recently updated one
                  parts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                  part = parts[0];
                  // 3. Cache the result
                  cachePart(code, part);
              }
          }

          if (!part) {
              playBeep('error');
              toast({
                  title: "Part Not Found",
                  description: `No part found with barcode: ${code}`,
                  variant: "destructive",
              });
               // Unlock quickly if not found
               setTimeout(() => {
                  scanActiveRef.current = true;
                  setLoading(false);
               }, 2000);
               return;
          }

          // 4. Success Flow
          const scanData = {
              barcode: code,
              part,
              timestamp: new Date().toISOString(),
              source
          };

          setRecentScans(prev => [scanData, ...prev].slice(0, 10));

          if (batchMode && onBatchAdd) {
              // Batch mode: Add to list and immediately unlock for next scan
              onBatchAdd(scanData);
              toast({ title: "Added to Batch", description: `${part.name} added` });
              // Quick unlock for batch mode
              setTimeout(() => {
                  scanActiveRef.current = true;
                  setLoading(false);
               }, 500);
          } else {
              // Single Scan Mode: Go to Menu
              setActivePart(scanData);
              setScanStep('menu'); 
              
              // Reset form defaults
              setTxQty(1);
              setTxNotes('');
              setTxMachineId(selectedMachineId || 'none');
              setLoading(false);
              // Note: scanActiveRef remains false here until user cancels or finishes transaction
          }

      } catch (error) {
          console.error('[Scanner] Processing Error:', error);
          playBeep('error');
          toast({ title: "Error", description: "Failed to process scan", variant: "destructive" });
          setTimeout(() => {
              scanActiveRef.current = true;
              setLoading(false);
          }, 2000);
      } finally {
          // Decrement active queue or clean up if needed
      }
   };

   // Queue Manager
   const processQueue = async () => {
       if (queryInProgressRef.current || scanQueueRef.current.length === 0) return;

       queryInProgressRef.current = true;
       setLoading(true);

       const currentBatch = [...scanQueueRef.current];
       scanQueueRef.current = []; // Clear queue

       for (const item of currentBatch) {
           // Double check gatekeeper for single mode inside the loop just in case
           if (!batchMode && scanStep !== 'scan') {
               console.log("Skipping queued scan because user is busy in menu.");
               continue; 
           }

           await processBarcode(item.code, item.source);
           
           // If single mode success, we stop processing the rest of the queue to show the UI
           if (!batchMode && scanStep === 'menu') break;
       }

       queryInProgressRef.current = false;
       // If queue filled up again while processing, re-trigger
       if (scanQueueRef.current.length > 0) {
           processQueue();
       } else {
            // Only turn off loading if we are truly done and not in a blocking UI state
            if (batchMode || scanStep === 'scan') {
                setLoading(false);
            }
       }
   };

   // Main Entry Point
   const handleScan = (code, source = 'camera') => {
      // 1. STRICT GATEKEEPER
      if (!scanActiveRef.current && !batchMode) {
          return;
      }
      
      console.log(`[Scanner] Received: ${code} from ${source}`);
      playBeep('success');
      
      // If not batch mode, we lock immediately to prevent UI jitter
      if (!batchMode) {
          scanActiveRef.current = false;
      }

      // 2. Add to Queue
      scanQueueRef.current.push({ code, source });

      // 3. Debounce / Batch Logic
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const shouldFlushImmediately = scanQueueRef.current.length >= MAX_BATCH_SIZE;

      if (shouldFlushImmediately) {
          console.log("[Scanner] Max batch size reached, flushing queue...");
          processQueue();
      } else {
          // Wait for debounce window
          debounceTimerRef.current = setTimeout(() => {
              console.log("[Scanner] Debounce timer fired, flushing queue...");
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
      const handleKeyDown = (event) => {
         // Only capture HID input when in scan mode and HID mode is active
         if (scanStep !== 'scan' || mode !== 'hid' || !hidActiveFlagRef.current) return;

         // 🔒 CRITICAL: Block ALL modifier key combinations to prevent browser shortcuts
         // This prevents Ctrl+J (Downloads), Ctrl+K (Search), Ctrl+Shift+J (DevTools), etc.
         if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
            event.preventDefault();
            return;
         }

         // Ignore special keys that shouldn't be in barcode
         if (['Escape', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(event.key)) {
            return;
         }

         event.preventDefault();
         
         // Enter key triggers the scan
         if (event.key === 'Enter') {
            if (hidBufferRef.current.length > 0) {
               handleScanRef.current(hidBufferRef.current, 'hid');
               hidBufferRef.current = '';
            }
            return;
         }
         
         // Build up the barcode buffer
         hidBufferRef.current += event.key;
         
         // Clear timeout and restart it
         if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
         hidTimeoutRef.current = setTimeout(() => {
            // If we have accumulated text without Enter, still process it
            if (hidBufferRef.current.length > 2) {
               handleScanRef.current(hidBufferRef.current, 'hid');
               hidBufferRef.current = '';
            } else {
               hidBufferRef.current = '';
            }
         }, HID_SCAN_TIMEOUT_MS);
      };

      // Set flag when entering HID mode
      if (scanStep === 'scan' && mode === 'hid') {
         hidActiveFlagRef.current = true;
         window.addEventListener('keydown', handleKeyDown, true); // Use capture phase for priority
         return () => {
            hidActiveFlagRef.current = false;
            window.removeEventListener('keydown', handleKeyDown, true);
            if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
         };
      } else {
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
         toast({ variant: "destructive", title: "Error", description: "No technician logged in" });
         return;
      }
      
      setLoading(true);
      try {
         const isUsage = txType === 'usage';
         // Usage = negative, Restock = positive
         const quantityChange = isUsage ? -Math.abs(txQty) : Math.abs(txQty);
         
         if (isUsage && (activePart.part.current_quantity + quantityChange < 0)) {
            toast({ 
               variant: "destructive", 
               title: "Insufficient Stock", 
               description: `Current stock is ${activePart.part.current_quantity}. Cannot consume ${txQty}.` 
            });
            setLoading(false);
            return;
         }

         // Insert transaction with performed_by set to the RFID technician ID
         const { error: txError } = await supabase.from('inventory_transactions').insert({
            part_id: activePart.part.id,
            machine_id: txMachineId === 'none' ? null : txMachineId,
            transaction_type: txType, // 'usage' or 'restock'
            quantity: quantityChange,
            unit_cost: activePart.part.average_cost || 0,
            notes: txNotes,
            performed_by: performedByUserId  // ✅ NOW USING TECHNICIAN ID FROM RFID LOGIN
         });

         if (txError) throw txError;

         // Update part quantity
         const { error: updateError } = await supabase.from('spare_parts')
            .update({ current_quantity: activePart.part.current_quantity + quantityChange })
            .eq('id', activePart.part.id);

         if (updateError) throw updateError;

         playBeep('success');
         toast({ title: "Success", description: `${isUsage ? 'Used' : 'Restocked'} ${txQty} x ${activePart.part.name}` });
         
         // Invalidate cache for this part since quantity changed
         scanCacheRef.current.delete(activePart.barcode);

         if (onScanComplete) onScanComplete(activePart);
         
         resetScanner();

      } catch (error) {
         console.error('Transaction error:', error);
         toast({ variant: "destructive", title: "Transaction Failed", description: error.message });
      } finally {
         setLoading(false);
      }
   };

   // Helper function to safely stop camera tracks
   const safeStopVideoTracks = () => {
      if (videoRef.current && videoRef.current.srcObject) {
         try {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
               track.stop();
            });
            videoRef.current.srcObject = null;
         } catch (e) {
            console.error('[Scanner] Error stopping video tracks:', e);
         }
      }
   };

   const resetScanner = () => {
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
   };

  // --- CAMERA LIFECYCLE (ZXing Only) ---
useEffect(() => {
   let reader = null;
   let mounted = true;
   
   const startCamera = async () => {
      if (scanStep !== 'scan' || mode !== 'camera') return;

      // Small delay to let UI settle
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
               // Check mounted state AND scanStep
               if (!mounted || scanStep !== 'scan' || mode !== 'camera') return;
               
               if (result) {
                  const text = result.getText();
                  console.log('[ZXing] Detected barcode:', text);
                  handleScan(text, 'camera');
               }
            }
         );
         
         setCameraError(null);
         console.log('[Camera] Started successfully');
      } catch (err) {
         console.error("[Camera] Init Error:", err);
         if (mounted) {
            setCameraError("Could not access camera. Please check permissions.");
         }
      }
   };

   const stopCamera = () => {
      console.log('[Camera] Stopping camera...');
      scanActiveRef.current = false;

      if (zxingReaderRef.current) {
         try {
            if (typeof zxingReaderRef.current.reset === 'function') {
               zxingReaderRef.current.reset();
            }
         } catch(e) { 
            console.warn('[Camera] Error resetting reader:', e);
         }
         zxingReaderRef.current = null;
      }
      
      safeStopVideoTracks();
   };

   // Proper lifecycle management
   if (scanStep === 'scan' && mode === 'camera') {
      console.log('[Camera] Starting camera for scan...');
      startCamera();
   } else {
      console.log('[Camera] Not in scan mode, stopping...');
      stopCamera();
   }

   // Cleanup on unmount or when dependencies change
   return () => {
      console.log('[Camera] useEffect cleanup');
      mounted = false;
      stopCamera();
   };
}, [scanStep, mode, batchMode, handleScan]); // handleScan is safe here - it's in camera effect

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
            <CardHeader className="bg-slate-50 border-b py-4">
               <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
                  <QrCode className="w-5 h-5 text-teal-600" />
                  {scanStep === 'scan' ? 'Scan Item' : scanStep === 'menu' ? 'Action Required' : 'Transaction'}
                  {batchMode && <Badge variant="secondary" className="ml-auto">Batch Mode</Badge>}
               </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
               
               {/* STEP 1: SCANNING (Camera, HID, or Manual) */}
               {scanStep === 'scan' && (
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                     <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="camera" className="flex items-center gap-1 text-xs md:text-sm"><Camera className="w-4 h-4" /> <span className="hidden sm:inline">Camera</span></TabsTrigger>
                        <TabsTrigger value="hid" className="flex items-center gap-1 text-xs md:text-sm"><QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Scanner</span></TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-1 text-xs md:text-sm"><Keyboard className="w-4 h-4" /> <span className="hidden sm:inline">Manual</span></TabsTrigger>
                     </TabsList>

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
                                 {/* Target Box Overlay */}
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

                     {/* HID Scanner Tab */}
                     <TabsContent value="hid" className="mt-0">
                        <div className="space-y-4 p-8 bg-slate-50 rounded-lg border border-slate-200">
                           <div className="text-center space-y-2">
                              <p className="text-sm text-slate-600 font-medium">External Barcode Scanner Ready</p>
                              <p className="text-xs text-slate-500">Point your handheld scanner at the barcode</p>
                           </div>
                           <div className="bg-white p-4 rounded border-2 border-dashed border-teal-300 text-center">
                              <p className="text-xs text-slate-500 font-mono">Waiting for scan...</p>
                           </div>
                           {/* Hidden input to capture HID events but keep focus clear */}
                           <Input 
                              type="text"
                              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                              tabIndex="-1"
                           />
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

               {/* STEP 2: ACTION MENU */}
               {scanStep === 'menu' && activePart && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                     <PartSummary part={activePart.part} />
                     
                     <div className="grid grid-cols-1 gap-3 mb-4">
                        <Button 
                           size="lg" 
                           className="h-16 text-lg font-semibold bg-red-600 hover:bg-red-700 shadow-sm"
                           onClick={() => {
                              setTxType('usage');
                              setScanStep('transaction');
                           }}
                        >
                           <MinusCircle className="w-6 h-6 mr-3" />
                           Use Item
                        </Button>
                        <Button 
                           size="lg" 
                           className="h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 shadow-sm"
                           onClick={() => {
                              setTxType('restock');
                              setScanStep('transaction');
                           }}
                        >
                           <PlusCircle className="w-6 h-6 mr-3" />
                           Restock Item
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

               {/* STEP 3: TRANSACTION FORM */}
               {scanStep === 'transaction' && activePart && (
                  <div className="animate-in slide-in-from-right-4 duration-200">
                     <div className="flex items-center mb-4">
                        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setScanStep('menu')}>
                           <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <h3 className="ml-auto font-semibold text-lg capitalize text-slate-700">
                           {txType === 'usage' ? 'Consume Stock' : 'Add Stock'}
                        </h3>
                     </div>

                     <PartSummary part={activePart.part} />

                     <div className="space-y-5 bg-white p-1">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input 
                                 type="number" 
                                 min="1"
                                 value={txQty}
                                 onChange={(e) => setTxQty(parseInt(e.target.value) || 0)}
                                 className="font-bold text-xl h-12 text-center"
                              />
                           </div>
                           {txType === 'usage' && (
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
                           )}
                        </div>

                        <div className="space-y-2">
                           <Label>{txType === 'usage' ? 'Reason / Notes' : 'Source / Notes'}</Label>
                           <Textarea 
                              placeholder={txType === 'usage' ? "Reason for usage..." : "Received from..."}
                              value={txNotes}
                              onChange={(e) => setTxNotes(e.target.value)}
                              className="resize-none h-24 text-base"
                           />
                        </div>

                        <Button 
                           className={`w-full h-14 text-lg font-bold shadow-md ${txType === 'usage' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                           onClick={handleTransaction}
                           disabled={loading}
                        >
                           {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                           Confirm {txType === 'usage' ? 'Usage' : 'Restock'}
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

export default Scanner;