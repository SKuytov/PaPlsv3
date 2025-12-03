import React, { useState, useMemo } from 'react';
import { Search, TrendingDown, ArrowUpDown, Zap, Filter, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from '@/utils/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const PartComparison = ({ parts = [], onSwitchSupplier, onBulkSwitch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'potentialSavings', direction: 'desc' });
  const [filters, setFilters] = useState({ supplier: 'all', category: 'all' });
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedParts, setSelectedParts] = useState([]); 

  const categories = useMemo(() => [...new Set(parts.map(p => p.category).filter(Boolean))], [parts]);

  // Calculations for the filtered data
  const filteredAndSortedParts = useMemo(() => {
    return parts.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.part_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filters.category === 'all' || p.category === filters.category;
        const matchesSupplier = filters.supplier === 'all' || p.supplier_options?.some(opt => opt.supplier?.name === filters.supplier);
        return matchesSearch && matchesCategory && matchesSupplier;
    }).sort((a, b) => {
        const aValue = a[sortConfig.key] || 0;
        const bValue = b[sortConfig.key] || 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [parts, searchTerm, filters, sortConfig]);

  const handleSort = (key) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const handleSelectAll = (checked) => {
      if (checked) {
          setSelectedParts(filteredAndSortedParts.map(p => p.id));
      } else {
          setSelectedParts([]);
      }
  };

  const handleBulkAction = () => {
      const partsToSwitch = parts.filter(p => selectedParts.includes(p.id) && p.bestAltOption);
      if (partsToSwitch.length > 0) {
          const updates = partsToSwitch.map(p => ({
              partId: p.id,
              supplierOptionId: p.bestAltOption.id
          }));
          onBulkSwitch(updates);
          setSelectedParts([]); 
      }
  };

  // Summary Metrics Calculation
  const summaryMetrics = useMemo(() => {
    const currentAnnualCost = filteredAndSortedParts.reduce((acc, part) => {
        const price = part.oemOption?.unit_price || 0;
        return acc + (price * part.annualUsage);
    }, 0);

    const optimizedAnnualCost = filteredAndSortedParts.reduce((acc, part) => {
        const currentPrice = part.oemOption?.unit_price || 0;
        const altPrice = part.bestAltOption?.unit_price || currentPrice; // If no better option, stick to current
        return acc + (altPrice * part.annualUsage);
    }, 0);

    const totalSavings = currentAnnualCost - optimizedAnnualCost;
    const savingsPercentage = currentAnnualCost > 0 ? (totalSavings / currentAnnualCost) * 100 : 0;

    return { currentAnnualCost, optimizedAnnualCost, totalSavings, savingsPercentage };
  }, [filteredAndSortedParts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Metrics - Excel Style Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Annual Spend</div>
              <div className="text-2xl font-bold text-slate-700 mt-1">{formatCurrency(summaryMetrics.currentAnnualCost)}</div>
              <div className="text-xs text-slate-400 mt-1">Based on Supplier 1 prices</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border shadow-sm relative overflow-hidden">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">New 2025 Projection</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(summaryMetrics.optimizedAnnualCost)}</div>
              <div className="text-xs text-green-600/80 mt-1 font-medium">Optimized Cost</div>
              <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
              <div className="text-xs font-medium text-green-800 uppercase tracking-wider">Total Net Savings</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(summaryMetrics.totalSavings)}</div>
              <div className="flex items-center text-xs text-green-700 mt-1 font-bold">
                  <TrendingDown className="w-3 h-3 mr-1" /> {summaryMetrics.savingsPercentage.toFixed(1)}% Reduction
              </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg shadow-sm text-white flex flex-col justify-center items-start">
             <div className="text-sm font-medium opacity-90">Ready to Optimize?</div>
             <div className="text-2xl font-bold mt-1">{filteredAndSortedParts.filter(p => p.potentialSavings > 0).length} <span className="text-sm font-normal opacity-70">Parts found</span></div>
             <Button size="sm" variant="secondary" className="w-full mt-3 h-8 text-xs" onClick={() => handleSelectAll(true)}>
                Select All Opportunities
             </Button>
          </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
         <div className="flex-1 w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              className="pl-9 bg-slate-50 border-slate-200" 
              placeholder="Search by Article Name or Number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
             <Select value={filters.category} onValueChange={v => setFilters(prev => ({...prev, category: v}))}>
                <SelectTrigger className="w-[180px] bg-slate-50"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
             </Select>
             
             {selectedParts.length > 0 && (
                 <Button size="sm" className="bg-green-600 hover:bg-green-500 shadow-md animate-in zoom-in duration-200" onClick={handleBulkAction}>
                     <Zap className="w-4 h-4 mr-2 fill-current" /> Apply Best Price ({selectedParts.length})
                 </Button>
             )}
         </div>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                     <th className="p-4 w-10 text-center border-r"><Checkbox checked={filteredAndSortedParts.length > 0 && selectedParts.length === filteredAndSortedParts.length} onCheckedChange={handleSelectAll} /></th>
                     <th className="p-4 border-r min-w-[300px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                        <div className="flex items-center justify-between">
                           Article / Part Details
                           <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </div>
                     </th>
                     <th className="p-4 border-r text-center bg-blue-50/30 min-w-[140px]">
                        Supplier 1 <span className="block text-[10px] font-normal text-slate-400 mt-0.5">(Current / OEM)</span>
                     </th>
                     <th className="p-4 border-r text-center bg-green-50/30 min-w-[140px]">
                        Supplier 2 <span className="block text-[10px] font-normal text-slate-400 mt-0.5">(Alternative)</span>
                     </th>
                     <th className="p-4 border-r text-center min-w-[120px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('savingsPerUnit')}>
                        Difference <span className="block text-[10px] font-normal text-slate-400 mt-0.5">(Per Unit)</span>
                     </th>
                     <th className="p-4 border-r text-center w-[100px]">
                        Annual<br/>Qty
                     </th>
                     <th className="p-4 text-center bg-slate-100 min-w-[150px] cursor-pointer hover:bg-slate-200" onClick={() => handleSort('potentialSavings')}>
                        TOTAL (NET) <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Projected Savings</span>
                     </th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedParts.length === 0 ? (
                     <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No matching parts found.</td></tr>
                  ) : (
                     filteredAndSortedParts.map((part) => {
                        const isSelected = selectedParts.includes(part.id);
                        const hasSavings = part.potentialSavings > 0;
                        
                        return (
                           <tr key={part.id} 
                               className={cn(
                                  "group hover:bg-slate-50 transition-colors duration-150",
                                  isSelected && "bg-blue-50/40 hover:bg-blue-50/60"
                               )}
                           >
                              <td className="p-4 border-r text-center">
                                  <Checkbox checked={isSelected} onCheckedChange={(checked) => setSelectedParts(prev => checked ? [...prev, part.id] : prev.filter(id => id !== part.id))} />
                              </td>
                              <td className="p-4 border-r relative">
                                 <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors cursor-pointer" onClick={() => setSelectedPart(part)}>
                                    {part.name}
                                 </div>
                                 <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border">{part.part_number}</span>
                                    {part.category && <span className="text-slate-400">• {part.category}</span>}
                                 </div>
                              </td>
                              
                              {/* Supplier 1 (Current) */}
                              <td className="p-4 border-r text-center bg-blue-50/5">
                                 {part.oemOption ? (
                                    <div className="flex flex-col items-center">
                                       <span className="font-bold text-slate-700">{formatCurrency(part.oemOption.unit_price)}</span>
                                       <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={part.oemOption.supplier?.name}>
                                          {part.oemOption.supplier?.name}
                                       </span>
                                    </div>
                                 ) : <span className="text-slate-300">-</span>}
                              </td>

                              {/* Supplier 2 (New) */}
                              <td className="p-4 border-r text-center bg-green-50/5 relative">
                                 {part.bestAltOption ? (
                                    <div className="flex flex-col items-center">
                                       <span className={cn("font-bold", hasSavings ? "text-green-700" : "text-slate-700")}>
                                          {formatCurrency(part.bestAltOption.unit_price)}
                                       </span>
                                       <span className="text-[10px] text-green-600/70 truncate max-w-[120px]" title={part.bestAltOption.supplier?.name}>
                                          {part.bestAltOption.supplier?.name}
                                       </span>
                                       {hasSavings && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                    </div>
                                 ) : <span className="text-slate-300">-</span>}
                              </td>

                              {/* Difference */}
                              <td className="p-4 border-r text-center">
                                 {part.savingsPerUnit > 0 ? (
                                    <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full inline-block">
                                       +{formatCurrency(part.savingsPerUnit)}
                                    </div>
                                 ) : <span className="text-slate-300">-</span>}
                              </td>

                              {/* Quantity */}
                              <td className="p-4 border-r text-center font-mono text-slate-600 text-sm">
                                 {part.annualUsage}
                              </td>

                              {/* Total Net Savings */}
                              <td className="p-4 text-center bg-slate-50/50 font-medium">
                                 {part.potentialSavings > 0 ? (
                                    <div className="flex flex-col items-center">
                                       <span className="text-green-700 font-bold text-base">{formatCurrency(part.potentialSavings)}</span>
                                       <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 mt-1 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                          onClick={(e) => { e.stopPropagation(); setSelectedPart(part); }}
                                       >
                                          Analyze
                                       </Button>
                                    </div>
                                 ) : <span className="text-slate-300 font-normal">-</span>}
                              </td>
                           </tr>
                        );
                     })
                  )}
               </tbody>
               {/* Footer Totals */}
               <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                  <tr>
                     <td colSpan={6} className="p-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Total Potential Savings:</td>
                     <td className="p-4 text-center font-bold text-green-700 text-lg bg-green-50/50 border-l border-slate-200">
                        {formatCurrency(summaryMetrics.totalSavings)}
                     </td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedPart} onOpenChange={(open) => !open && setSelectedPart(null)}>
        <DialogContent className="max-w-2xl">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                  <span className="text-slate-400 font-normal">Savings Analysis:</span> 
                  <span>{selectedPart?.name}</span>
              </DialogTitle>
           </DialogHeader>
           
           {selectedPart && (
              <div className="space-y-6 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-sm font-medium text-slate-500 mb-1">Current Supplier (OEM)</div>
                          <div className="text-lg font-bold text-slate-800">{selectedPart.oemOption?.supplier?.name || "Unknown"}</div>
                          <div className="text-3xl font-bold mt-2 text-slate-900">{formatCurrency(selectedPart.oemOption?.unit_price || 0)}</div>
                          <div className="text-xs text-slate-400 mt-1">per unit</div>
                      </div>
                      <div className="p-5 rounded-xl bg-green-50 border border-green-100 relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl">RECOMMENDED</div>
                          <div className="text-sm font-medium text-green-700 mb-1">Alternative Supplier</div>
                          <div className="text-lg font-bold text-green-800">{selectedPart.bestAltOption?.supplier?.name || "None Available"}</div>
                          <div className="text-3xl font-bold mt-2 text-green-700">{formatCurrency(selectedPart.bestAltOption?.unit_price || 0)}</div>
                          <div className="text-xs text-green-600 mt-1">per unit</div>
                      </div>
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                      <div>
                          <div className="text-sm text-slate-300 uppercase tracking-wider font-medium">Annual Impact</div>
                          <div className="text-xs text-slate-400 mt-1">Based on {selectedPart.annualUsage} units/year</div>
                      </div>
                      <div className="text-right">
                           <div className="text-4xl font-bold text-green-400">{formatCurrency(selectedPart.potentialSavings)}</div>
                           <div className="text-sm text-green-300 font-medium">Total Net Savings</div>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setSelectedPart(null)}>Close</Button>
                      {selectedPart.bestAltOption && (
                          <Button className="bg-green-600 hover:bg-green-500" onClick={() => { onSwitchSupplier(selectedPart.id, selectedPart.bestAltOption.id); setSelectedPart(null); }}>
                              <Check className="w-4 h-4 mr-2" /> Switch to {selectedPart.bestAltOption.supplier?.name}
                          </Button>
                      )}
                  </div>
              </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartComparison;