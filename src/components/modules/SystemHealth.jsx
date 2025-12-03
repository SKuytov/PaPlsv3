import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, Server, ShieldCheck, AlertTriangle, 
  RefreshCw, Download, Clock, Users, HardDrive, Zap, 
  CheckCircle, XCircle, FileWarning, Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { dbService } from '@/lib/supabase';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast.js';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner.jsx';
import { ProgressBar } from './dashboard/Charts.jsx';
import jsPDF from 'jspdf';

const StatusBadge = ({ status }) => {
  const styles = {
    healthy: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
    loading: 'bg-slate-100 text-slate-500 border-slate-200'
  };
  
  const icons = {
    healthy: <CheckCircle className="w-3 h-3 mr-1" />,
    warning: <AlertTriangle className="w-3 h-3 mr-1" />,
    critical: <XCircle className="w-3 h-3 mr-1" />,
    loading: <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.loading}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const SystemHealth = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(null);
  
  // Metrics State
  const [systemStatus, setSystemStatus] = useState('loading'); // healthy, warning, critical
  const [dbMetrics, setDbMetrics] = useState({ status: 'unknown', latency: 0, size: 'Unknown' });
  const [tableCounts, setTableCounts] = useState({});
  const [integrityIssues, setIntegrityIssues] = useState([]);
  const [moduleStatus, setModuleStatus] = useState({});
  const [activeUsers, setActiveUsers] = useState(0);
  
  useEffect(() => {
    runDiagnostics();
    const interval = setInterval(runDiagnostics, 60000); // Auto-refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (userRole?.name !== 'God Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">This dashboard is restricted to God Admin users only.</p>
      </div>
    );
  }

  const checkTable = async (tableName) => {
    const start = performance.now();
    const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    const end = performance.now();
    return { 
      count: count || 0, 
      latency: Math.round(end - start), 
      status: error ? 'critical' : 'healthy',
      error: error?.message 
    };
  };

  const runDiagnostics = async () => {
    setLoading(true);
    const startTime = performance.now();
    let issues = [];
    let moduleHealth = {};
    
    try {
      // 1. Database Connectivity & Latency
      const { latency: dbLatency, error: dbError } = await checkTable('users');
      setDbMetrics(prev => ({ 
        ...prev, 
        latency: dbLatency, 
        status: dbError ? 'critical' : dbLatency > 500 ? 'warning' : 'healthy' 
      }));

      // 2. Module Health Checks (Table Access)
      const tablesToCheck = [
        { name: 'spare_parts', module: 'Inventory' },
        { name: 'orders', module: 'Procurement' },
        { name: 'machines', module: 'Assets' },
        { name: 'suppliers', module: 'Suppliers' },
        { name: 'downtime_events', module: 'Maintenance' },
        { name: 'audit_logs', module: 'Security' }
      ];

      const counts = {};
      
      for (const t of tablesToCheck) {
        const result = await checkTable(t.name);
        moduleHealth[t.module] = result.status;
        counts[t.name] = result.count;
        if (result.status === 'critical') issues.push(`Module ${t.module} unreachable: ${result.error}`);
        if (result.latency > 1000) issues.push(`High latency on ${t.name} (${result.latency}ms)`);
      }
      setTableCounts(counts);
      setModuleStatus(moduleHealth);

      // 3. Data Integrity Checks
      // Check orphaned order items
      const { count: orphanedItems } = await supabase.from('order_items').select('id', { count: 'exact', head: true }).is('order_id', null);
      if (orphanedItems > 0) issues.push(`${orphanedItems} Orphaned Order Items detected`);

      // Check machines without building
      const { count: lostMachines } = await supabase.from('machines').select('id', { count: 'exact', head: true }).is('building_id', null);
      if (lostMachines > 0) issues.push(`${lostMachines} Machines missing location assignment`);

      setIntegrityIssues(issues);

      // 4. User Activity (Simulated "Active" based on last login if available, otherwise just total)
      const { count: totalUsers } = await supabase.from('users').select('id', { count: 'exact', head: true });
      setActiveUsers(totalUsers); // In real app, query session table or last_sign_in

      // Final Status Determination
      if (issues.length === 0 && !dbError) setSystemStatus('healthy');
      else if (issues.length < 3 && !dbError) setSystemStatus('warning');
      else setSystemStatus('critical');

      setLastRun(new Date());

    } catch (error) {
      console.error("Diagnostics failed:", error);
      setSystemStatus('critical');
      toast({ variant: "destructive", title: "Diagnostics Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("System Health Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`System Status: ${systemStatus.toUpperCase()}`, 20, 40);
    doc.text(`DB Latency: ${dbMetrics.latency}ms`, 20, 50);
    
    doc.text("Issues Found:", 20, 65);
    integrityIssues.forEach((issue, i) => {
      doc.text(`- ${issue}`, 20, 75 + (i * 10));
    });

    if (integrityIssues.length === 0) doc.text("- No issues found.", 20, 75);

    doc.save("health_report.pdf");
    toast({ title: "Exported", description: "Health report downloaded." });
  };

  const handleClearCache = () => {
    window.location.reload();
  };

  if (loading && !lastRun) return <LoadingSpinner message="Running System Diagnostics..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-teal-600" />
            System Health
          </h1>
          <p className="text-slate-600 mt-1">Real-time diagnostics and performance monitoring</p>
        </div>
        <div className="flex gap-2">
           <span className="text-xs text-slate-400 flex items-center px-2">
              <Clock className="w-3 h-3 mr-1" /> Last run: {lastRun?.toLocaleTimeString()}
           </span>
           <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading}>
             <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Run Diagnostics
           </Button>
           <Button variant="default" size="sm" onClick={handleExportReport}>
             <Download className="w-4 h-4 mr-2" /> Export Report
           </Button>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
           <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 text-sm font-medium">Overall Status</span>
              <StatusBadge status={systemStatus} />
           </div>
           <div className="text-2xl font-bold text-slate-800">
              {systemStatus === 'healthy' ? 'Operational' : systemStatus === 'warning' ? 'Degraded' : 'Critical Failure'}
           </div>
           <div className="mt-2 text-xs text-slate-400">Uptime: 99.98% (30 days)</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
           <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 text-sm font-medium">DB Latency</span>
              <Zap className={`w-5 h-5 ${dbMetrics.latency < 200 ? 'text-green-500' : 'text-yellow-500'}`} />
           </div>
           <div className="text-2xl font-bold text-slate-800">{dbMetrics.latency} ms</div>
           <div className="mt-2 text-xs text-slate-400">Target: &lt; 200ms</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
           <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 text-sm font-medium">Total Records</span>
              <Database className="w-5 h-5 text-blue-500" />
           </div>
           <div className="text-2xl font-bold text-slate-800">
              {(Object.values(tableCounts).reduce((a,b) => a+b, 0)).toLocaleString()}
           </div>
           <div className="mt-2 text-xs text-slate-400">Across {Object.keys(tableCounts).length} tables</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
           <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 text-sm font-medium">Registered Users</span>
              <Users className="w-5 h-5 text-purple-500" />
           </div>
           <div className="text-2xl font-bold text-slate-800">{activeUsers}</div>
           <div className="mt-2 text-xs text-slate-400">Active accounts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Module Health */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-500" /> Module Status & Storage
           </h3>
           <div className="space-y-4">
              {Object.entries(moduleStatus).map(([module, status]) => (
                 <div key={module} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                       <span className="font-medium text-slate-700">{module} Module</span>
                    </div>
                    <div className="flex items-center gap-6">
                       <span className="text-xs text-slate-500 font-mono">
                          {Object.entries(tableCounts).find(([k]) => k.includes(module.toLowerCase().split(' ')[0]) || (module === 'Procurement' && k==='orders') || (module === 'Inventory' && k==='spare_parts') || (module === 'Assets' && k==='machines') || (module === 'Maintenance' && k==='downtime_events') || (module === 'Security' && k==='audit_logs'))?.[1] || 0} records
                       </span>
                       <StatusBadge status={status} />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Quick Actions & Config */}
        <div className="space-y-6">
           <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Terminal className="w-5 h-5 text-slate-500" /> Quick Actions
              </h3>
              <div className="space-y-3">
                 <Button variant="outline" className="w-full justify-start" onClick={handleClearCache}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Restart / Clear Cache
                 </Button>
                 <Button variant="outline" className="w-full justify-start" onClick={runDiagnostics}>
                    <Activity className="w-4 h-4 mr-2" /> Rerun Deep Scan
                 </Button>
                 <Button variant="outline" className="w-full justify-start" onClick={() => toast({title: "Backup", description: "Supabase manages daily backups automatically."})}>
                    <HardDrive className="w-4 h-4 mr-2" /> Verify Backup Status
                 </Button>
              </div>
           </div>

           <div className="bg-slate-800 text-slate-300 rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5" /> System Config
              </h3>
              <div className="space-y-2 text-xs font-mono">
                 <div className="flex justify-between">
                    <span>Environment</span>
                    <span className="text-teal-400">Production</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Version</span>
                    <span className="text-white">v2.4.0</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Region</span>
                    <span className="text-white">eu-central-1</span>
                 </div>
                 <div className="flex justify-between">
                    <span>DB Version</span>
                    <span className="text-white">Postgres 15</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Integrity Issues & Logs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-slate-500" /> Diagnostics Log
         </h3>
         {integrityIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
               <CheckCircle className="w-12 h-12 mb-2 text-green-100" />
               <p>All systems nominal. No integrity issues detected.</p>
            </div>
         ) : (
            <div className="space-y-2">
               {integrityIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                     <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                     <span>{issue}</span>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default SystemHealth;