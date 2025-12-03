import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Scale, Users, Download, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import SavingsDashboard from './savings/SavingsDashboard';
import PartComparison from './savings/PartComparison';
import SupplierPerformance from './savings/SupplierPerformance';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const SupplierSavings = () => {
  const [activeTab, setActiveTab] = useState('comparison'); // Default to comparison table for verification
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState({
    totalPotentialSavings: 0,
    totalActualSavings: 0,
    savingsBySupplier: {},
    savingsByCategory: [],
    topOpportunities: [],
    processedParts: [],
    suppliers: [],
    trends: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { parts, orderItems } = await dbService.getSavingsAnalysisData();
      const { data: allTransactions } = await dbService.getAllTransactions(90); // Get 90 days history
      
      // Process Data
      let totalPotential = 0;
      let processedParts = [];
      let suppliersMap = new Map();
      let categorySavings = {};

      // 1. Analyze Potential Savings per Part
      parts?.forEach(part => {
         const annualUsage = part.specifications?.annual_usage || 0; 
         
         // Logic: Identify "Current" (Supplier 1) vs "Alternative" (Supplier 2)
         // If no preferred supplier is set, we assume the highest priced one is the "current baseline" for savings calculation 
         // or we skip. Let's assume highest price is baseline if no preferred is set, or preferred is baseline.
         const oemOption = part.supplier_options?.find(opt => opt.is_preferred) 
            || part.supplier_options?.sort((a, b) => b.unit_price - a.unit_price)[0]; 
         
         // Find best price that is NOT the oemOption
         const altOptions = part.supplier_options?.filter(opt => opt.id !== oemOption?.id) || [];
         const bestAltOption = altOptions.sort((a, b) => a.unit_price - b.unit_price)[0];

         let savingsPerUnit = 0;
         let savingsPercent = 0;
         let potentialSavings = 0;

         // Calculate savings if an alternative exists and is cheaper
         if (oemOption && bestAltOption && bestAltOption.unit_price < oemOption.unit_price) {
            savingsPerUnit = oemOption.unit_price - bestAltOption.unit_price;
            savingsPercent = ((savingsPerUnit / oemOption.unit_price) * 100).toFixed(1);
            potentialSavings = savingsPerUnit * annualUsage;
            
            if (part.category) {
                categorySavings[part.category] = (categorySavings[part.category] || 0) + potentialSavings;
            }
            totalPotential += potentialSavings;
         }

         processedParts.push({
            ...part,
            oemOption: oemOption || null, // Supplier 1
            bestAltOption: bestAltOption || null, // Supplier 2
            savingsPerUnit,
            savingsPercent: Number(savingsPercent),
            potentialSavings,
            annualUsage
         });
         
         part.supplier_options?.forEach(opt => {
            if(opt.supplier) suppliersMap.set(opt.supplier.id, opt.supplier);
         });
      });

      // 2. Analyze Actual Realized Savings from Order History
      let totalActual = 0;
      let savingsBySupplier = {};

      orderItems?.forEach(item => {
         const part = parts.find(p => p.id === item.part_id);
         if (!part) return;
         
         const maxPrice = Math.max(...(part.supplier_options?.map(o => o.unit_price) || [0]));
         
         if (maxPrice > 0 && item.unit_price < maxPrice) {
            const saving = (maxPrice - item.unit_price) * item.quantity;
            totalActual += saving;
            
            const supName = item.supplier?.name || "Unknown";
            savingsBySupplier[supName] = (savingsBySupplier[supName] || 0) + saving;
         }
      });

      // 3. Calculate Cumulative Trend
      const trends = [];
      let cumulativeSavings = 0;
      const savingsByDate = {};
      
      allTransactions?.forEach(tx => {
          const date = new Date(tx.created_at).toLocaleDateString();
          if (!savingsByDate[date]) savingsByDate[date] = 0;
          
          const part = parts.find(p => p.id === tx.part_id);
          if(part && tx.transaction_type === 'usage') { 
              const maxPrice = Math.max(...(part.supplier_options?.map(o => o.unit_price) || [0]));
              if(maxPrice > 0 && tx.unit_cost < maxPrice) {
                  savingsByDate[date] += (maxPrice - (tx.unit_cost || 0)) * tx.quantity;
              }
          }
      });
      
      Object.keys(savingsByDate).sort().forEach(date => {
          cumulativeSavings += savingsByDate[date];
          trends.push({ date, savings: cumulativeSavings });
      });

      setAnalysisData({
         totalPotentialSavings: totalPotential,
         totalActualSavings: totalActual,
         savingsBySupplier,
         savingsByCategory: Object.entries(categorySavings).map(([name, value]) => ({ name, value })),
         topOpportunities: processedParts.filter(p => p.potentialSavings > 0).sort((a, b) => b.potentialSavings - a.potentialSavings),
         processedParts,
         suppliers: Array.from(suppliersMap.values()),
         trends,
         partCount: parts.length
      });

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load savings analysis." });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchSupplier = async (partId, supplierOptionId) => {
      setLoading(true);
      const { error } = await dbService.setPreferredSupplier(partId, supplierOptionId);
      if (error) {
          toast({ variant: "destructive", title: "Update Failed", description: "Could not switch preferred supplier." });
      } else {
          toast({ title: "Supplier Switched", description: "Preferred supplier updated. Recalculating savings..." });
          await loadData(); 
      }
      setLoading(false);
  };
  
  const handleBulkSwitch = async (updates) => {
      setLoading(true);
      const { error } = await dbService.bulkSetPreferredSupplier(updates);
      if (error) {
          toast({ variant: "destructive", title: "Bulk Update Failed", description: "Some items may not have updated." });
      } else {
          toast({ title: "Batch Update Complete", description: `Successfully switched ${updates.length} parts to best price.` });
          await loadData();
      }
      setLoading(false);
  };

  const handleExport = () => {
    const headers = "Part Number,Name,Supplier 1 (Current),Supplier 2 (Alt),Diff,Annual Qty,Total Net Savings\n";
    const rows = analysisData.processedParts.map(p => 
      `${p.part_number},"${p.name}",${p.oemOption?.unit_price||0},${p.bestAltOption?.unit_price||0},${p.savingsPerUnit},${p.annualUsage},${p.potentialSavings}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'savings_tracker_export.csv'; a.click();
  };
  
  const highImpactCount = analysisData.processedParts.filter(p => p.potentialSavings > 500).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h1 className="text-3xl font-bold text-slate-800">Savings Tracker</h1>
            <p className="text-slate-600 mt-1">Compare suppliers and track net savings.</p>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
               <Download className="w-4 h-4 mr-2" /> Export Report
            </Button>
         </div>
      </div>
      
      {highImpactCount > 0 && !loading && (
          <Alert className="bg-gradient-to-r from-green-50 to-white border-green-100">
              <Zap className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 font-bold">Potential Savings Detected</AlertTitle>
              <AlertDescription className="text-green-700">
                  {highImpactCount} parts have significant savings opportunities available (>€500/yr).
              </AlertDescription>
          </Alert>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
         {[
           { id: 'comparison', label: 'Comparison Table', icon: Scale },
           { id: 'dashboard', label: 'Metrics & Trends', icon: LayoutDashboard },
           { id: 'performance', label: 'Supplier Performance', icon: Users }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === tab.id 
                 ? 'bg-white text-slate-800 shadow-sm' 
                 : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <tab.icon className="w-4 h-4 mr-2" />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Content */}
      {loading && !analysisData.processedParts.length ? (
         <div className="h-64 flex items-center justify-center">
            <LoadingSpinner message="Analyzing pricing data..." />
         </div>
      ) : (
         <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-[500px]"
         >
            {activeTab === 'dashboard' && <SavingsDashboard analysis={analysisData} />}
            {activeTab === 'comparison' && <PartComparison parts={analysisData.processedParts} onSwitchSupplier={handleSwitchSupplier} onBulkSwitch={handleBulkSwitch} />}
            {activeTab === 'performance' && <SupplierPerformance suppliers={analysisData.suppliers} />}
         </motion.div>
      )}
    </div>
  );
};

export default SupplierSavings;