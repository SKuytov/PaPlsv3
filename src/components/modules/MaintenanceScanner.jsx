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

const MaintenanceScanner = ({ onLogout, technicianName, technicianId }) => {
   const { toast } = useToast();
   const { user } = useAuth();
   
   // --- State Management ---
   const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
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
   
   // Optimization: Queue and Cache Refs
   const scanQueueRef = useRef([]);
   const queryInProgressRef = useRef(false);
   const scanCacheRef = useRef(new Map());
   const debounceTimerRef = useRef(null);
   const queryCounterRef = useRef(0);

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
               const delay = 2000 * Math.pow(2, attempt - 1);
               await new Promise(resolve => setTimeout(resolve, delay));
               return fetchWithRetry(barcode, attempt + 1);
           }
           throw error;
       }
   };

   const processBarcode = async (code, source) => {
      let part = getCachedPart(code);

      try {
          if (!part) {
              const parts = await fetchWithRetry(code);
              
              if (parts && parts.length > 0) {
                  parts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                  part = parts[0];
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
               setTimeout(() => {
                  scanActiveRef.current = true;
                  setLoading(false);
               }, 2000);
               return;
          }

          const scanData = {
              barcode: code,
              part,
              timestamp: new Date().toISOString(),
              source
          };

          setRecentScans(prev => [scanData, ...prev].slice(0, 10));
          setActivePart(scanData);
          setScanStep('menu'); 
          
          setTxQty(1);
          setTxNotes('');
          setTxMachineId('none');
          setLoading(false);

      } catch (error) {
          console.error('[MaintenanceScanner] Processing Error:', error);
          playBeep('error');
          toast({ title: "Error", description: "Failed to process scan", variant: "destructive" });
          setTimeout(() => {
              scanActiveRef.current = true;
              setLoading(false);
          }, 2000);
      }
   };

   const processQueue = async () => {
       if (queryInProgressRef.current || scanQueueRef.current.length === 0) return;
       queryInProgressRef.current = true;
       setLoading(true);

       const currentBatch = [...scanQueueRef.current];
       scanQueueRef.current = [];

       for (const item of currentBatch) {
           if (scanStep !== 'scan') {
               continue; 
           }
           await processBarcode(item.code, item.source);
           if (scanStep === 'menu') break;
       }

       queryInProgressRef.current = false;
       if (scanQueueRef.current.length > 0) {
           processQueue();
       } else {
            if (scanStep === 'scan') {
                setLoading(false);
            }
       }
   };

   const handleScan = (code, source = 'camera') => {
      if (!scanActiveRef.current) {
          return;
      }
      
      playBeep('success');
      scanActiveRef.current = false;

      scanQueueRef.current.push({ code, source });

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const shouldFlushImmediately = scanQueueRef.current.length >= MAX_BATCH_SIZE;

      if (shouldFlushImmediately) {
          processQueue();
      } else {
          debounceTimerRef.current = setTimeout(() => {
              processQueue();
          }, DEBOUNCE_DELAY_MS);
      }
   };

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
         const { error: txError } = await supabase.from('inventory_transactions').insert({
            part_id: activePart.part.id,
            machine_id: txMachineId === 'none' ? null : txMachineId,
            transaction_type: 'usage', // TECHNICIAN: ALWAYS USAGE
            quantity: quantityChange,
            unit_cost: activePart.part.average_cost || 0,
            notes: txNotes,
            performed_by: performedByUserId,  // ✅ NOW USING TECHNICIAN ID FROM RFID LOGIN
            performed_by_role: 'technician' // Track that this was a technician
         });

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
                  if (!mounted || scanStep !== 'scan') return;
                  if (result) {
                     const text = result.getText();
                     handleScan(text, 'zxing');
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
      const val = e.target.manualBarcode?.value || "";
      if (val.trim()) {
         handleScan(val.trim(), 'manual');
         e.target.manualBarcode.value = "";
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
               
               {/* STEP 1: SCANNING */}
               {scanStep === 'scan' && (
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                     <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="camera" className="flex items-center gap-2"><Camera className="w-4 h-4" /> Camera</TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-2"><Keyboard className="w-4 h-4" /> Manual</TabsTrigger>
                     </TabsList>

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

                     <TabsContent value="manual" className="mt-0">
                        <form onSubmit={handleManualSubmit} className="space-y-4 p-8 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center">
                           <div className="w-full max-w-xs space-y-4">
                              <Label htmlFor="manual-barcode" className="text-center block text-lg">Enter Barcode</Label>
                              <Input
                                 name="manualBarcode"
                                 id="manual-barcode"
                                 type="text"
                                 placeholder="Type code & press enter..."
                                 className="text-center text-lg h-12"
                                 autoFocus
                              />
                              <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                                 {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Look Up"}
                              </Button>
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