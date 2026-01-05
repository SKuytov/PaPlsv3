import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Box, Wrench, Users, FileText, 
  BarChart3, BookOpen, X, QrCode, Timer,
  TrendingUp, LogOut, ShoppingCart
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
    { to: "/quotes/dashboard", icon: ShoppingCart, label: "📊 Quotes Dashboard" },
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
        {/* Header with Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3 flex-1">
            {/* PartPulse Logo - Inline SVG */}
            <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 254.55 73.08">
  <defs>
    <style>
      .cls-1 {
        fill: url(#linear-gradient);
      }

      .cls-1, .cls-2, .cls-3, .cls-4 {
        stroke-width: 0px;
      }

      .cls-5 {
        font-family: Roboto-Light, Roboto;
        font-size: 10.8px;
        font-weight: 300;
      }

      .cls-5, .cls-6 {
        fill: #2d3748;
      }

      .cls-7 {
        letter-spacing: .02em;
      }

      .cls-2 {
        fill: #1e3a5f;
      }

      .cls-3 {
        fill: #f36b32;
      }

      .cls-6 {
        font-family: Roboto-Black, Roboto;
        font-size: 33.91px;
        font-weight: 800;
      }

      .cls-4 {
        fill: #154577;
      }

      .cls-8 {
        letter-spacing: 0em;
      }
    </style>
    <linearGradient id="linear-gradient" x1="0" y1="36.14" x2="93.84" y2="36.14" gradientUnits="userSpaceOnUse">
      <stop offset=".46" stop-color="#1e3a5f"/>
      <stop offset=".47" stop-color="#313e5a"/>
      <stop offset=".47" stop-color="#654a4f"/>
      <stop offset=".48" stop-color="#b75d3e"/>
      <stop offset=".48" stop-color="#f36b32"/>
    </linearGradient>
  </defs>
  <path class="cls-4" d="M25.97,32.89h-11.94l-3.22-2.67,2.03-7.88,7.04.6s.84-2.37,1.69-3.63c.71-1.05,2.5-3.13,2.5-3.13l-3.35-5.11s-.02-.1.02-.13l6.72-5.59c.29-.24.71-.22.98.04l4.55,4.25s1.92-1.25,3.63-1.92c1.53-.6,3.78-1.09,3.78-1.09L40.57,0h5.78v14.34s-6.87-.08-12.75,5.43c-7.87,7.37-7.63,13.13-7.63,13.13Z"/>
  <path class="cls-4" d="M69.53,32.89h11.94s3.22-2.67,3.22-2.67l-2.03-7.88-7.04.6s-.84-2.37-1.69-3.63c-.71-1.05-2.5-3.13-2.5-3.13l3.35-5.11s.02-.1-.02-.13l-6.72-5.59c-.29-.24-.71-.22-.98.04l-4.55,4.25s-1.92-1.25-3.63-1.92c-1.53-.6-3.78-1.09-3.78-1.09L54.93,0h-5.78s0,14.34,0,14.34c0,0,6.87-.08,12.75,5.43,7.87,7.37,7.63,13.13,7.63,13.13Z"/>
  <path class="cls-3" d="M69.53,32.89h11.94s3.22-2.67,3.22-2.67l-2.03-7.88-7.04.6s-.84-2.37-1.69-3.63c-.71-1.05-2.5-3.13-2.5-3.13l3.35-5.11s.02-.1-.02-.13l-6.72-5.59c-.29-.24-.71-.22-.98.04l-4.55,4.25s-1.92-1.25-3.63-1.92c-1.53-.6-3.78-1.09-3.78-1.09L54.93,0h-5.78s0,14.34,0,14.34c0,0,6.87-.08,12.75,5.43,7.87,7.37,7.63,13.13,7.63,13.13Z"/>
  <path class="cls-2" d="M25.97,32.89h-11.94l-3.22-2.67,2.03-7.88,7.04.6s.84-2.37,1.69-3.63c.71-1.05,2.5-3.13,2.5-3.13l-3.35-5.11s-.02-.1.02-.13l6.72-5.59c.29-.24.71-.22.98.04l4.55,4.25s1.92-1.25,3.63-1.92c1.53-.6,3.78-1.09,3.78-1.09l.18-6.64h5.78v14.34s-6.87-.08-12.75,5.43c-7.87,7.37-7.63,13.13-7.63,13.13Z"/>
  <path class="cls-3" d="M69.53,40.19h11.94s3.22,2.67,3.22,2.67l-2.03,7.88-7.04-.6s-.84,2.37-1.69,3.63c-.71,1.05-2.5,3.13-2.5,3.13l3.35,5.11s.02.1-.02.13l-6.72,5.59c-.29.24-.71.22-.98-.04l-4.55-4.25s-1.92,1.25-3.63,1.92c-1.53.6-3.78,1.09-3.78,1.09l-.18,6.64h-5.78s0-14.34,0-14.34c0,0,6.87.08,12.75-5.43,7.87-7.37,7.63-13.13,7.63-13.13Z"/>
  <path class="cls-2" d="M25.97,40.19h-11.94l-3.22,2.67,2.03,7.88,7.04-.6s.84,2.37,1.69,3.63c.71,1.05,2.5,3.13,2.5,3.13l-3.35,5.11s-.02.1.02.13l6.72,5.59c.29.24.71.22.98-.04l4.55-4.25s1.92,1.25,3.63,1.92c1.53.6,3.78,1.09,3.78,1.09l.18,6.64h5.78v-14.34s-6.87.08-12.75-5.43c-7.87-7.37-7.63-13.13-7.63-13.13Z"/>
  <path class="cls-1" d="M51.18,54.96l-7.24-27.72-3.83,11.13-40.11-.36v-1.83l38.25-.32,5.94-18.63c.06-.2.35-.19.4.01l7.12,28.94,3.29-10.5,38.85.46v1.96l-36.88.28-5.18,16.58c-.09.3-.52.3-.6,0Z"/>
  <text class="cls-6" transform="translate(102.95 48.73)"><tspan class="cls-8" x="0" y="0">P</tspan><tspan x="21.89" y="0">a</tspan><tspan class="cls-7" x="39.89" y="0">r</tspan><tspan x="53.57" y="0">tPulse</tspan></text>
  <text class="cls-5" transform="translate(241.9 60.94)"><tspan x="0" y="0">V3</tspan></text>
</svg>
            <span className="text-white font-bold text-lg tracking-tight">PartPulse</span>
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
