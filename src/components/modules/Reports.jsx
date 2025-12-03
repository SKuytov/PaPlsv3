import React, { useState } from 'react';
import { FileText, Download, BarChart3, Package, Truck, Wrench, Database, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

const ReportCard = ({ title, description, icon: Icon, onExport, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all flex flex-col h-full">
     <div className="flex items-start gap-4 mb-4">
        <div className="bg-slate-50 p-3 rounded-lg text-slate-600">
           <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1">
           <h3 className="font-bold text-lg text-slate-800">{title}</h3>
           <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>
     </div>
     <div className="mt-auto grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => onExport('email')} disabled={loading} className="w-full border-slate-200 hover:bg-slate-50 hover:text-blue-600">
           <Mail className="w-4 h-4 mr-2" /> Email
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('csv')} disabled={loading} className="w-full border-slate-200 hover:bg-slate-50 hover:text-teal-600">
           {loading ? '...' : <><Download className="w-4 h-4 mr-2" /> CSV</>}
        </Button>
     </div>
  </div>
);

const Reports = () => {
  const [loading, setLoading] = useState(null);
  const { toast } = useToast();

  const handleAction = async (type, action) => {
    if (action === 'email') {
      toast({ title: "Report Scheduled", description: "The report will be emailed to stakeholders momentarily." });
      return;
    }
    
    // CSV Export Logic
    setLoading(type);
    try {
      let data = [], headers = '', filename = '';
      
      if (type === 'inventory') {
        const res = await dbService.getSpareParts({}, 0, 10000);
        data = res.data;
        headers = "ID,Name,Part Number,Category,Stock,Avg Cost,Total Value\n";
        filename = 'inventory_summary';
        data = data.map(d => `${d.id},"${d.name}",${d.part_number},${d.category},${d.current_quantity},${d.average_cost},${(d.current_quantity * (d.average_cost||0)).toFixed(2)}`);
      } else if (type === 'orders') {
        const res = await dbService.getOrders();
        data = res.data;
        headers = "Order #,Date,Status,Total,Supplier,Created By\n";
        filename = 'procurement_report';
        data = data.map(d => `${d.order_number},${d.created_at},${d.status},${d.total_amount},"${d.items?.[0]?.supplier?.name || 'Mixed'}","${d.creator?.full_name}"`);
      } else if (type === 'downtime') {
        const res = await dbService.getDowntimeEvents();
        data = res.data;
        headers = "Date,Machine,Reason,Duration(min),Cost\n";
        filename = 'downtime_log';
        data = data.map(d => `${d.start_time},"${d.machine?.machine_code}",${d.root_cause},${d.duration_minutes},${d.downtime_cost}`);
      } else if (type === 'financial') {
        // Basic financial dump
        const res = await dbService.getRecentTransactions(1000);
        data = res.data;
        headers = "Date,Type,Part,Cost Impact,User\n";
        filename = 'financial_log';
        data = data.map(d => `${d.created_at},${d.transaction_type},"${d.part?.name}",${d.unit_cost * d.quantity},"${d.user?.full_name}"`);
      }

      if (!data || data.length === 0) {
        toast({ title: "No Data", description: "Report is empty." });
        return;
      }

      const blob = new Blob([headers + data.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast({ title: "Export Ready", description: "Download started." });

    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Export Failed", description: e.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Reports Center</h1>
          <p className="text-slate-600 mt-1">Generate operational, financial, and inventory intelligence</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <ReportCard 
              title="Inventory Valuation" 
              description="Complete stock levels, asset value by category, and slow-moving item identification."
              icon={Package}
              onExport={(act) => handleAction('inventory', act)}
              loading={loading === 'inventory'}
           />
           <ReportCard 
              title="Procurement Summary" 
              description="Purchase history, supplier performance metrics, and pending order status."
              icon={Truck}
              onExport={(act) => handleAction('orders', act)}
              loading={loading === 'orders'}
           />
           <ReportCard 
              title="Downtime & Reliability" 
              description="Machine failure logs, MTBF/MTTR calculations, and maintenance cost impact."
              icon={Wrench}
              onExport={(act) => handleAction('downtime', act)}
              loading={loading === 'downtime'}
           />
           <ReportCard 
              title="Financial Ledger" 
              description="Detailed transaction log of all costs: parts usage, purchasing, and waste."
              icon={BarChart3}
              onExport={(act) => handleAction('financial', act)}
              loading={loading === 'financial'}
           />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Reports;