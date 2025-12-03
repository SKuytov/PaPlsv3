import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, ArrowRight, CheckCircle, AlertTriangle, Loader2, 
  FileJson, RefreshCw, ShieldAlert, HardDrive, Download, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

const MigrationTools = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Source, 2: Preview/Validate, 3: Migrate, 4: Report
  const [loading, setLoading] = useState(false);
  const [legacyData, setLegacyData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, warnings: 0, errors: 0 });
  const [progress, setProgress] = useState(0);
  const [migrationResult, setMigrationResult] = useState(null);

  // --- Step 1: Fetch Data ---
  const fetchLegacyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('legacy_parts').select('*');
      if (error) throw error;
      setLegacyData(data);
      validateData(data);
      setStep(2);
      toast({ title: "Data Fetched", description: `Loaded ${data.length} records from legacy schema.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Fetch Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Validate & Map Preview ---
  const validateData = (data) => {
    let v = 0, w = 0, e = 0;
    const processed = data.map(row => {
      const issues = [];
      if (!row.name) issues.push({ type: 'error', msg: 'Missing Name' });
      if (!row.part_number) issues.push({ type: 'warning', msg: 'Missing Part Number' });
      if (data.filter(d => d.part_number === row.part_number && d.part_number).length > 1) issues.push({ type: 'error', msg: 'Duplicate Part Number' });
      
      if (issues.some(i => i.type === 'error')) e++;
      else if (issues.length > 0) w++;
      else v++;

      return { ...row, _issues: issues, _status: issues.some(i => i.type === 'error') ? 'error' : issues.length > 0 ? 'warning' : 'valid' };
    });
    setLegacyData(processed);
    setStats({ total: data.length, valid: v, warnings: w, errors: e });
  };

  // --- Step 3: Migration Logic ---
  const executeMigration = async () => {
    setStep(3);
    setLoading(true);
    const newLogs = [];
    let successCount = 0;
    let failCount = 0;

    const addLog = (msg, type = 'info') => {
      const log = { time: new Date().toLocaleTimeString(), msg, type };
      newLogs.unshift(log);
      setLogs([...newLogs]);
    };

    addLog("Starting migration process...", 'info');

    try {
      // 1. Extract and Create Suppliers
      addLog("Extracting unique suppliers...", 'info');
      const uniqueSuppliers = [...new Set(legacyData.map(d => d.supplier).filter(Boolean))];
      const supplierMap = {}; // name -> id

      for (const sName of uniqueSuppliers) {
        // Check if exists
        let { data: existing } = await supabase.from('suppliers').select('id').eq('name', sName).maybeSingle();
        if (!existing) {
          const { data: newSup, error } = await supabase.from('suppliers').insert({ name: sName, is_oem: false }).select().single();
          if (error) {
             addLog(`Failed to create supplier ${sName}: ${error.message}`, 'error');
             continue;
          }
          supplierMap[sName] = newSup.id;
          addLog(`Created new supplier: ${sName}`, 'success');
        } else {
          supplierMap[sName] = existing.id;
          addLog(`Mapped existing supplier: ${sName}`, 'info');
        }
      }

      // 2. Migrate Parts
      addLog(`Processing ${legacyData.length} parts...`, 'info');
      
      for (let i = 0; i < legacyData.length; i++) {
        const old = legacyData[i];
        setProgress(Math.round(((i + 1) / legacyData.length) * 100));
        
        if (old._status === 'error') {
          addLog(`Skipping part ${old.name || 'Unknown'} due to validation errors.`, 'warning');
          failCount++;
          continue;
        }

        try {
          // Map Fields
          const newPart = {
             name: old.name,
             part_number: old.part_number || `LEGACY-${old.id}`,
             category: old.main_group || 'Uncategorized',
             manufacturer: 'Unknown (Legacy)', // Default if missing
             current_quantity: old.quantity || 0,
             min_stock_level: old.min_stock || 0,
             reorder_point: (old.min_stock || 0) + (old.safety_stock || 0),
             unit_of_measure: 'pcs',
             bin_location: old.location,
             photo_url: old.image_url,
             barcode: `SP-${Date.now()}-${Math.floor(Math.random()*1000)}`, // Generate barcode
             specifications: {
                sub_category: old.sub_group,
                criticality: old.criticality,
                model_3d_url: old.model_3d_url,
                onedrive_link: old.cad_url,
                attachments: old.attachments,
                weekly_usage: old.weekly_usage,
                monthly_usage: old.monthly_usage,
                safety_stock: old.safety_stock,
                migrated_from: 'legacy_parts',
                migration_date: new Date().toISOString()
             }
          };

          // Insert Part
          const { data: partData, error: partError } = await supabase.from('spare_parts').insert(newPart).select().single();
          
          if (partError) throw partError;

          // Link Supplier if exists
          if (old.supplier && supplierMap[old.supplier]) {
            await supabase.from('part_supplier_options').insert({
               part_id: partData.id,
               supplier_id: supplierMap[old.supplier],
               unit_price: old.price || 0,
               lead_time_days: (old.lead_time_weeks || 0) * 7,
               is_preferred: true
            });
          }

          successCount++;
          // Only log every 10th to reduce noise, or on error
          if (i % 10 === 0) addLog(`Migrated: ${newPart.name}`, 'success');

        } catch (err) {
          failCount++;
          addLog(`Error migrating ${old.name}: ${err.message}`, 'error');
        }
      }

      setMigrationResult({ success: successCount, failed: failCount, total: legacyData.length });
      setStep(4);
      addLog("Migration completed.", 'success');

    } catch (err) {
      addLog(`Critical Migration Failure: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---
  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8 relative">
       <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2" />
       {[1, 2, 3, 4].map(s => (
         <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${s <= step ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
           {s < step ? <CheckCircle className="w-5 h-5" /> : s}
         </div>
       ))}
    </div>
  );

  const SourceView = () => (
    <div className="text-center space-y-6 py-10">
      <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
         <Database className="w-10 h-10 text-slate-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Connect to Legacy Data</h2>
      <p className="text-slate-500 max-w-md mx-auto">
        Ready to migrate parts from the <code>legacy_parts</code> table. 
        This will fetch 388+ records, validate the schema mapping, and prepare for transfer.
      </p>
      <Button size="lg" onClick={fetchLegacyData} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
        Fetch Legacy Data
      </Button>
    </div>
  );

  const ValidationView = () => (
    <div className="space-y-4">
       <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
             <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
             <div className="text-xs text-blue-600 uppercase">Total Records</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
             <div className="text-2xl font-bold text-green-700">{stats.valid}</div>
             <div className="text-xs text-green-600 uppercase">Ready</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-center">
             <div className="text-2xl font-bold text-yellow-700">{stats.warnings}</div>
             <div className="text-xs text-yellow-600 uppercase">Warnings</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
             <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
             <div className="text-xs text-red-600 uppercase">Errors</div>
          </div>
       </div>

       <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 sticky top-0">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Name</th>
                <th className="p-3">Old P/N</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {legacyData.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    {row._status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {row._status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {row._status === 'error' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                  </td>
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3 font-mono text-xs">{row.part_number}</td>
                  <td className="p-3">{row.supplier}</td>
                  <td className="p-3 text-xs text-red-600">
                     {row._issues.map(issue => issue.msg).join(', ')}
                  </td>
                </tr>
              ))}
              {legacyData.length > 100 && <tr><td colSpan={5} className="p-3 text-center text-slate-500">...and {legacyData.length - 100} more</td></tr>}
            </tbody>
          </table>
       </div>
       
       <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          <div className="flex gap-2">
             {stats.errors > 0 && <span className="text-red-600 text-sm flex items-center mr-2"><AlertTriangle className="w-4 h-4 mr-1"/> Fix errors before proceeding</span>}
             <AlertDialog.Root>
                <AlertDialog.Trigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700" disabled={stats.errors > stats.total * 0.5}>Start Migration</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal>
                   <AlertDialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
                   <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg shadow-xl">
                      <AlertDialog.Title className="font-bold text-lg">Confirm Migration</AlertDialog.Title>
                      <AlertDialog.Description className="text-slate-600 my-4">
                        This will import {stats.valid + stats.warnings} records into the live WMS database. This action cannot be easily undone without database admin support.
                      </AlertDialog.Description>
                      <div className="flex justify-end gap-3">
                         <AlertDialog.Cancel asChild><Button variant="outline">Cancel</Button></AlertDialog.Cancel>
                         <AlertDialog.Action asChild><Button onClick={executeMigration} className="bg-teal-600">Yes, Migrate Data</Button></AlertDialog.Action>
                      </div>
                   </AlertDialog.Content>
                </AlertDialog.Portal>
             </AlertDialog.Root>
          </div>
       </div>
    </div>
  );

  const ExecutionView = () => (
    <div className="space-y-6 py-8">
       <div className="text-center">
          <RefreshCw className={`w-16 h-16 mx-auto text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <h3 className="text-xl font-bold mt-4">Migrating Data...</h3>
          <p className="text-slate-500">Please do not close this window.</p>
       </div>
       
       <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
             <span>Progress</span>
             <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
             <motion.div 
               className="bg-teal-600 h-full" 
               initial={{ width: 0 }} 
               animate={{ width: `${progress}%` }}
               transition={{ duration: 0.5 }}
             />
          </div>
       </div>

       <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
          {logs.map((log, i) => (
            <div key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-green-400'}>
               <span className="opacity-50">[{log.time}]</span> {log.msg}
            </div>
          ))}
       </div>
    </div>
  );

  const ReportView = () => (
     <div className="text-center space-y-6 py-8">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${migrationResult?.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
           <CheckCircle className={`w-10 h-10 ${migrationResult?.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800">Migration Completed</h2>
        
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
           <div className="p-4 border rounded-lg">
              <div className="text-3xl font-bold text-slate-800">{migrationResult?.total}</div>
              <div className="text-xs uppercase text-slate-500">Total Processed</div>
           </div>
           <div className="p-4 border rounded-lg bg-green-50 border-green-100">
              <div className="text-3xl font-bold text-green-700">{migrationResult?.success}</div>
              <div className="text-xs uppercase text-green-600">Successful</div>
           </div>
           <div className="p-4 border rounded-lg bg-red-50 border-red-100">
              <div className="text-3xl font-bold text-red-700">{migrationResult?.failed}</div>
              <div className="text-xs uppercase text-red-600">Failed</div>
           </div>
        </div>

        <div className="flex justify-center gap-4 pt-6">
           <Button variant="outline" onClick={() => setStep(1)}>Start New Migration</Button>
           <Button className="bg-teal-600" onClick={() => window.location.reload()}>Return to Dashboard</Button>
        </div>
     </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Data Migration Assistant</h1>
        <p className="text-slate-600">Transfer legacy data to WMS V2 Schema</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 min-h-[500px]">
         {renderStepIndicator()}
         
         {step === 1 && <SourceView />}
         {step === 2 && <ValidationView />}
         {step === 3 && <ExecutionView />}
         {step === 4 && <ReportView />}
      </div>
    </div>
  );
};

export default MigrationTools;