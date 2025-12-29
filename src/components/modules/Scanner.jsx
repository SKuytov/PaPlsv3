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
   
   // ⭐ CRITICAL: isProcessing is STATE not REF - React knows to update it
   const [isProcessing, setIsProcessing] = useState(false);
   
   // Refs for non-visual state
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
      console.log(`[Scanner] Processing barcode: ${code} from ${source}`);
      
      // 1. Check Cache First
      let part = getCachedPart(code);

      try {
          // 2. If not in cache, fetch from DB
          if (!part) {
              console.log(`[Scanner] Fetching from database...`);
              const parts = await fetchWithRetry(code);
              
              if (parts && parts.length > 0) {
                  // If multiple duplicate barcodes exist, take the most recently updated one
                  parts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                  part = parts[0];
                  console.log(`[Scanner] Found part: ${part.name}`);
                  // 3. Cache the result
                  cachePart(code, part);
              }
          }

          if (!part) {
              console.warn(`[Scanner] Part not found for barcode: ${code}`);
              playBeep('error');
              toast({
                  title: "Part Not Found",
                  description: `No part found with barcode: ${code}`,
                  variant: "destructive",
              });
              setIsProcessing(false);
              setLoading(false);
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
              setIsProcessing(false);
              setLoading(false);
          } else {
              // Single Scan Mode: Go to Menu
              setActivePart(scanData);
              setScanStep('menu');
              
              // Reset form defaults
              setTxQty(1);
              setTxNotes('');
              setTxMachineId(selectedMachineId || 'none');
              setLoading(false);
              setIsProcessing(false);
              console.log('[Scanner] Menu activated');
          }

      } catch (error) {
          console.error('[Scanner] Processing Error:', error);
          playBeep('error');
          toast({ title: "Error", description: "Failed to process scan", variant: "destructive" });
          setIsProcessing(false);
          setLoading(false);
      }
   };

   // Queue Manager
   const processQueue = async () => {
       console.log(`[Scanner] processQueue: queue length=${scanQueueRef.current.length}`);
       if (queryInProgressRef.current || scanQueueRef.current.length === 0) {
           return;
       }

       queryInProgressRef.current = true;
       setLoading(true);

       const currentBatch = [...scanQueueRef.current];
       scanQueueRef.current = []; // Clear queue

       // 🔧 FIX: Don't check scanStep here - process all items in queue
       for (const item of currentBatch) {
           await processBarcode(item.code, item.source);
           // Stop processing if menu was activated (found a part)
           if (activePart) break;
       }

       queryInProgressRef.current = false;
       
       if (scanQueueRef.current.length > 0) {
           processQueue();
       } else {
           setLoading(false);
       }
   };

   // ⭐ CRITICAL: handleScan depends ONLY on isProcessing state, not refs
   const handleScan = useCallback((code, source = 'camera') => {
      console.log(`[Scanner] handleScan called: ${code} from ${source}, isProcessing=${isProcessing}`);
      
      if (isProcessing) {
          console.warn(`[Scanner] Scan blocked - already processing`);
          return;
      }
      
      console.log(`[Scanner] Received: ${code}`);
      playBeep('success');
      setIsProcessing(true); // Lock via STATE

      scanQueueRef.current.push({ code, source });
      console.log(`[Scanner] Added to queue, length=${scanQueueRef.current.length}`);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (scanQueueRef.current.length >= MAX_BATCH_SIZE) {
          processQueue();
      } else {
          debounceTimerRef.current = setTimeout(() => {
              processQueue();
          }, DEBOUNCE_DELAY_MS);
      }
   }, [isProcessing, activePart]);

   // Reset processing flag when returning to scan mode
   useEffect(() => {
      if (scanStep === 'scan' && isProcessing) {
         console.log('[Scanner] Returning to scan mode, unlocking...');
         setIsProcessing(false);
      }
   }, [scanStep]);

   // --- HID SCANNER SETUP ---
   useEffect(() => {
      if (scanStep !== 'scan' || mode !== 'hid') return;
      
      console.log('[Scanner] Setting up HID listener');
      
      const handleKeyDown = (event) => {
         if (scanStep !== 'scan' || mode !== 'hid') return;

         // Block modifier keys
         if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
            event.preventDefault();
            return;
         }

         // Ignore special keys
         if (['Escape', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(event.key)) {
            return;
         }

         event.preventDefault();

         // Enter triggers scan
         if (event.key === 'Enter') {
            if (hidBufferRef.current.length > 0) {
               handleScan(hidBufferRef.current, 'hid');
               hidBufferRef.current = '';
            }
            return;
         }

         // Accumulate buffer
         hidBufferRef.current += event.key;
         console.log(`[Scanner] Buffer: "${hidBufferRef.current}"`);

         // Timeout processing
         if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
         hidTimeoutRef.current = setTimeout(() => {
            if (hidBufferRef.current.length > 2) {
               console.log(`[Scanner] Timeout -> processing: ${hidBufferRef.current}`);
               handleScan(hidBufferRef.current, 'hid');
            }
            hidBufferRef.current = '';
         }, HID_SCAN_TIMEOUT_MS);
      };

      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
         window.removeEventListener('keydown', handleKeyDown, true);
         if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
      };
   }, [scanStep, mode, handleScan]);

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

         // Insert transaction with performed_by set to the technician ID
         const { error: txError } = await supabase.from('inventory_transactions').insert({
            part_id: activePart.part.id,
            machine_id: txMachineId === 'none' ? null : txMachineId,
            transaction_type: txType, // 'usage' or 'restock'
            quantity: quantityChange,
            unit_cost: activePart.part.average_cost || 0,
            notes: txNotes,
            performed_by: performedByUserId  // ✅ USING TECHNICIAN ID
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
      console.log('[Scanner] Resetting scanner');
      if (hidTimeoutRef.current) clearTimeout(hidTimeoutRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      
      if (zxingReaderRef.current) {
         try {
            if (typeof zxingReaderRef.current.reset === 'function') {
               zxingReaderRef.current.reset();
            }
         } catch(e) {}
         zxingReaderRef.current = null;
      }

      safeStopVideoTracks();
      setActivePart(null);
      setDetailsModalOpen(false);
      setLoading(false);
      hidBufferRef.current = '';
      setScanStep('scan'); // This will trigger unlock via useEffect
   };

   // --- CAMERA LIFECYCLE (ZXing) ---
   useEffect(() => {
      let reader = null;
      let mounted = true;
      
      const startCamera = async () => {
         if (scanStep !== 'scan' || mode !== 'camera' || !mounted) return;
         
         await new Promise(r => setTimeout(r, 300));
         if (!mounted || scanStep !== 'scan' || mode !== 'camera' || !videoRef.current) return;

         try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            reader = new BrowserMultiFormatReader();
            zxingReaderRef.current = reader;

            await reader.decodeFromConstraints(
               { video: { facingMode: { ideal: "environment" } } },
               videoRef.current,
               (result) => {
                  if (mounted && scanStep === 'scan' && mode === 'camera' && result) {
                     handleScan(result.getText(), 'camera');
                  }
               }
            );
            
            setCameraError(null);
         } catch (err) {
            console.error("[Camera] Error:", err);
            if (mounted) setCameraError("Could not access camera.");
         }
      };

      const stopCamera = () => {
         if (zxingReaderRef.current?.reset) {
            try { zxingReaderRef.current.reset(); } catch(e) {}
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
      const val = new FormData(e.currentTarget).get('manualBarcode')?.trim() || '';
      if (val) {
         handleScan(val, 'manual');
         e.currentTarget.reset();
         manualInputRef.current?.focus();
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
               <div className="text-xs text-slate-500 mb-4 p-2 bg-slate-50 rounded border border-dashed">
                  <p>scanStep: {scanStep} | mode: {mode} | isProcessing: {isProcessing ? '🔒' : '✅'}</p>
               </div>
               
               {/* STEP 1: SCANNING */}
               {scanStep === 'scan' && (
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                     <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="camera"><Camera className="w-4 h-4" /> <span className="hidden sm:inline">Camera</span></TabsTrigger>
                        <TabsTrigger value="hid"><QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Scanner</span></TabsTrigger>
                        <TabsTrigger value="manual"><Keyboard className="w-4 h-4" /> <span className="hidden sm:inline">Manual</span></TabsTrigger>
                     </TabsList>

                     {/* Camera Tab */}
                     <TabsContent value="camera" className="space-y-4 mt-0">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-inner ring-1 ring-black/10">
                           {cameraError ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center bg-slate-900">
                                 <AlertTriangle className="w-12 h-12 mb-2 text-yellow-500" />
                                 <p className="text-sm mb-4">{cameraError}</p>
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
                        </div>
                     </TabsContent>

                     {/* Manual Entry Tab */}
                     <TabsContent value="manual" className="mt-0">
                        <form onSubmit={handleManualSubmit} className="space-y-4 p-8 bg-slate-50 rounded-lg border border-slate-200">
                           <Label className="text-center block text-lg mb-4">Enter Barcode</Label>
                           <Input ref={manualInputRef} name="manualBarcode" type="text" placeholder="Type code & press enter..." className="text-center text-lg h-12 font-mono" autoFocus autoComplete="off" />
                           <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                              {loading ? "Looking up..." : "Look Up"}
                           </Button>
                        </form>
                     </TabsContent>
                  </Tabs>
               )}

               {/* STEP 2: ACTION MENU */}
               {scanStep === 'menu' && activePart && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                     <PartSummary part={activePart.part} />
                     <div className="grid grid-cols-1 gap-3 mb-4">
                        <Button size="lg" className="h-16 text-lg font-semibold bg-red-600 hover:bg-red-700" onClick={() => {
                           setTxType('usage');
                           setScanStep('transaction');
                        }}>
                           <MinusCircle className="w-6 h-6 mr-3" />
                           Use Item
                        </Button>
                        <Button size="lg" className="h-16 text-lg font-semibold bg-green-600 hover:bg-green-700" onClick={() => {
                           setTxType('restock');
                           setScanStep('transaction');
                        }}>
                           <PlusCircle className="w-6 h-6 mr-3" />
                           Restock Item
                        </Button>
                        <Button size="lg" variant="outline" className="h-16 text-lg font-semibold border-2" onClick={() => setDetailsModalOpen(true)}>
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
                        <h3 className="ml-auto font-semibold text-lg">{txType === 'usage' ? 'Consume Stock' : 'Add Stock'}</h3>
                     </div>
                     <PartSummary part={activePart.part} />
                     <div className="space-y-5 bg-white p-1">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input type="number" min="1" value={txQty} onChange={(e) => setTxQty(parseInt(e.target.value) || 0)} className="font-bold text-xl h-12 text-center" />
                           </div>
                           {txType === 'usage' && (
                               <div className="space-y-2">
                                  <Label>Machine</Label>
                                  <Select value={txMachineId} onValueChange={setTxMachineId}>
                                     <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="none">-- General --</SelectItem>
                                        {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                     </SelectContent>
                                  </Select>
                               </div>
                           )}
                        </div>
                        <div className="space-y-2">
                           <Label>{txType === 'usage' ? 'Reason / Notes' : 'Source / Notes'}</Label>
                           <Textarea placeholder={txType === 'usage' ? "Reason for usage..." : "Received from..."} value={txNotes} onChange={(e) => setTxNotes(e.target.value)} className="resize-none h-24" />
                        </div>
                        <Button className={`w-full h-14 text-lg font-bold ${txType === 'usage' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`} onClick={handleTransaction} disabled={loading}>
                           {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                           Confirm {txType === 'usage' ? 'Usage' : 'Restock'}
                        </Button>
                     </div>
                  </div>
               )}

               {/* Recent Scans History */}
               {scanStep === 'scan' && recentScans.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                     <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between text-slate-500">
                        <span className="flex items-center gap-2"><History className="w-4 h-4" /> Recent</span>
                        <span>{showHistory ? 'Hide' : 'Show'}</span>
                     </Button>
                     {showHistory && (
                        <div className="mt-2 space-y-2">
                           {recentScans.map((scan, i) => (
                              <div key={i} className="flex justify-between text-sm p-2 bg-slate-50 rounded border">
                                 <span className="font-medium truncate flex-1">{scan.part.name}</span>
                                 <span className="text-slate-400 text-xs font-mono">{new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </CardContent>
         </Card>

         {activePart && <PartDetailsModal open={detailsModalOpen} part={activePart.part} onClose={() => setDetailsModalOpen(false)} onDeleteRequest={() => {}} onEditRequest={() => {}} />}
      </ErrorBoundary>
   );
};

export default Scanner;