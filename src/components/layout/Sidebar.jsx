import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Box, Wrench, Users, FileText, 
  BarChart3, BookOpen, X, QrCode, Timer,
  TrendingUp, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { signOut } = useAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/scanner", icon: QrCode, label: "Scanner" },
    { to: "/parts", icon: Box, label: "Spare Parts" },
    { to: "/machines", icon: Wrench, label: "Machines" },
    { to: "/suppliers", icon: Users, label: "Suppliers" },
    { to: "/savings", icon: TrendingUp, label: "Savings Tracker" },
    { to: "/orders", icon: FileText, label: "Orders" },
    { to: "/downtime", icon: Timer, label: "Downtime" },
    { to: "/reports", icon: BarChart3, label: "Reports" },
    { to: "/docs", icon: BookOpen, label: "Documentation" },

  ];

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out flex flex-col h-screen",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Box className="text-white w-5 h-5" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">WMS Pro</span>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/20 translate-x-1" 
                    : "hover:bg-slate-800 hover:text-white hover:translate-x-1"
                )
              }
            >
              <item.icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110")} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="bg-slate-800/50 rounded-xl p-4 relative overflow-hidden group hover:bg-slate-800 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h4 className="text-white text-sm font-semibold mb-1">Need Help?</h4>
            <p className="text-xs text-slate-400 mb-3">Check our docs for guides.</p>
            <NavLink 
              to="/docs" 
              className="block w-full bg-slate-700 hover:bg-slate-600 text-white text-center text-xs py-2 rounded-md transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Open Documentation
            </NavLink>
          </div>
          
          <button 
            onClick={signOut}
            className="mt-4 w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-red-400 transition-colors py-2 text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;