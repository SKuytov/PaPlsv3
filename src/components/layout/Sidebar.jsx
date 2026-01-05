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
            {/* PartPulse Logo */}
            <svg
              id="Layer_1"
              data-name="Layer 1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 57.14 16.45"
              className="w-12 h-auto flex-shrink-0"
            >
              <defs>
                <style>
                  {`.cls-1 { fill: url(#linear-gradient); }
                    .cls-1, .cls-2, .cls-3, .cls-4, .cls-5 { stroke-width: 0px; }
                    .cls-2 { fill: #2d3748; }
                    .cls-3 { fill: #1e3a5f; }
                    .cls-4 { fill: #f36b32; }
                    .cls-5 { fill: #154577; }`}
                </style>
                <linearGradient id="linear-gradient" x1="0" y1="8.13" x2="21.12" y2="8.13" gradientUnits="userSpaceOnUse">
                  <stop offset=".46" stopColor="#1e3a5f"/>
                  <stop offset=".47" stopColor="#313e5a"/>
                  <stop offset=".47" stopColor="#654a4f"/>
                  <stop offset=".48" stopColor="#b75d3e"/>
                  <stop offset=".48" stopColor="#f36b32"/>
                </linearGradient>
              </defs>
              <path className="cls-5" d="M5.84,7.4h-2.69l-.73-.6.46-1.77,1.58.14s.19-.53.38-.82c.16-.24.56-.7.56-.7l-.75-1.15s0-.02,0-.03l1.51-1.26c.07-.05.16-.05.22,0l1.02.96s.43-.28.82-.43c.34-.14.85-.25.85-.25L9.13,0h1.3v3.23s-1.55-.02-2.87,1.22c-1.77,1.66-1.72,2.95-1.72,2.95Z"/>
              <path className="cls-5" d="M15.65,7.4h2.69s.73-.6.73-.6l-.46-1.77-1.58.14s-.19-.53-.38-.82c-.16-.24-.56-.7-.56-.7l.75-1.15s0-.02,0-.03l-1.51-1.26c-.07-.05-.16-.05-.22,0l-1.02.96s-.43-.28-.82-.43c-.34-.14-.85-.25-.85-.25L12.36,0h-1.3s0,3.23,0,3.23c0,0,1.55-.02,2.87,1.22,1.77,1.66,1.72,2.95,1.72,2.95Z"/>
              <path className="cls-4" d="M15.65,7.4h2.69s.73-.6.73-.6l-.46-1.77-1.58.14s-.19-.53-.38-.82c-.16-.24-.56-.7-.56-.7l.75-1.15s0-.02,0-.03l-1.51-1.26c-.07-.05-.16-.05-.22,0l-1.02.96s-.43-.28-.82-.43c-.34-.14-.85-.25-.85-.25L12.36,0h-1.3s0,3.23,0,3.23c0,0,1.55-.02,2.87,1.22,1.77,1.66,1.72,2.95,1.72,2.95Z"/>
              <path className="cls-3" d="M5.84,7.4h-2.69l-.73-.6.46-1.77,1.58.14s.19-.53.38-.82c.16-.24.56-.7.56-.7l-.75-1.15s0-.02,0-.03l1.51-1.26c.07-.05.16-.05.22,0l1.02.96s.43-.28.82-.43c.34-.14.85-.25.85-.25l.04-1.49h1.3v3.23s-1.55-.02-2.87,1.22c-1.77,1.66-1.72,2.95-1.72,2.95Z"/>
              <path className="cls-4" d="M15.65,9.04h2.69s.73.6.73.6l-.46,1.77-1.58-.14s-.19.53-.38.82c-.16.24-.56.7-.56.7l.75,1.15s0,.02,0,.03l-1.51,1.26c-.07.05-.16.05-.22,0l-1.02-.96s-.43.28-.82.43c-.34.14-.85.25-.85.25l-.04,1.49h-1.3s0-3.23,0-3.23c0,0,1.55.02,2.87-1.22,1.77-1.66,1.72-2.95,1.72-2.95Z"/>
              <path className="cls-3" d="M5.84,9.04h-2.69l-.73.6.46,1.77,1.58-.14s.19.53.38.82c.16.24.56.7.56.7l-.75,1.15s0,.02,0,.03l1.51,1.26c.07.05.16.05.22,0l1.02-.96s.43.28.82.43c.34.14.85.25.85.25l.04,1.49h1.3v-3.23s-1.55.02-2.87-1.22c-1.77-1.66-1.72-2.95-1.72-2.95Z"/>
              <path className="cls-1" d="M11.52,12.37l-1.63-6.24-.86,2.5-9.03-.08v-.41l8.61-.07,1.34-4.19s.08-.04.09,0l1.6,6.51.74-2.36,8.74.1v.44l-8.3.06-1.17,3.73c-.02.07-.12.07-.13,0Z"/>
              <g>
                <path className="cls-2" d="M24.89,9.13v1.84h-1.31v-5.43h2.16c.41,0,.78.08,1.1.23.32.15.57.37.74.65.18.28.26.6.26.96,0,.53-.19.95-.57,1.27-.38.32-.9.48-1.56.48h-.83ZM24.89,8.12h.86c.25,0,.45-.06.58-.19.13-.13.2-.31.2-.54,0-.25-.07-.46-.2-.61-.14-.15-.32-.23-.56-.23h-.87v1.57Z"/>
                <path className="cls-2" d="M30.72,10.97c-.04-.08-.08-.2-.12-.36-.23.29-.55.44-.97.44-.38,0-.7-.11-.97-.34-.27-.23-.4-.52-.4-.87,0-.44.16-.77.48-.99.32-.22.79-.34,1.41-.34h.39v-.21c0-.37-.16-.56-.48-.56-.3,0-.45.15-.45.44h-1.26c0-.39.17-.71.5-.95.33-.24.75-.36,1.27-.36s.92.13,1.22.38c.3.25.45.59.46,1.03v1.78c0,.37.06.65.17.85v.06h-1.26ZM29.93,10.15c.16,0,.29-.03.39-.1.1-.07.18-.14.22-.23v-.64h-.37c-.44,0-.66.2-.66.59,0,.11.04.21.12.28s.18.11.29.11Z"/>
                <path className="cls-2" d="M34.94,8.07l-.41-.03c-.39,0-.65.12-.76.37v2.55h-1.26v-4.03h1.18l.04.52c.21-.4.51-.59.88-.59.13,0,.25.01.35.04l-.02,1.17Z"/>
                <path className="cls-2" d="M37.04,5.93v1h.66v.87h-.66v1.84c0,.15.03.26.08.32.05.06.16.09.32.09.12,0,.23,0,.31-.02v.9c-.23.07-.46.11-.71.11-.43,0-.75-.1-.96-.31-.21-.2-.31-.51-.31-.93v-2h-.51v-.87h.51v-1h1.26Z"/>
                <path className="cls-2" d="M39.56,9.13v1.84h-1.31v-5.43h2.16c.41,0,.78.08,1.1.23.32.15.57.37.74.65.18.28.26.6.26.96,0,.53-.19.95-.57,1.27-.38.32-.9.48-1.56.48h-.83ZM39.56,8.12h.86c.25,0,.45-.06.58-.19s.2-.31.2-.54c0-.25-.07-.46-.2-.61-.14-.15-.32-.23-.56-.23h-.87v1.57Z"/>
                <path className="cls-2" d="M45.56,10.53c-.27.34-.62.51-1.08.51s-.78-.13-1-.39c-.23-.26-.34-.63-.34-1.11v-2.61h1.26v2.62c0,.35.17.52.5.52.29,0,.49-.1.61-.31v-2.83h1.26v4.03h-1.18l-.04-.44Z"/>
                <path className="cls-2" d="M48.79,10.97h-1.26v-5.72h1.26v5.72Z"/>
                <path className="cls-2" d="M51.67,9.83c0-.11-.06-.19-.17-.26-.11-.06-.32-.13-.64-.2-.31-.07-.57-.16-.77-.27-.2-.11-.36-.25-.47-.41s-.16-.35-.16-.56c0-.37.15-.67.46-.91.31-.24.71-.36,1.2-.36.53,0,.96.12,1.28.36.32.24.48.56.48.95h-1.26c0-.32-.17-.48-.51-.48-.13,0-.24.04-.33.11s-.13.16-.13.27.05.2.16.27c.11.07.28.13.52.17s.45.1.63.16c.61.21.91.58.91,1.12,0,.37-.16.67-.49.9-.33.23-.75.35-1.27.35-.35,0-.65-.06-.92-.19s-.48-.29-.63-.51c-.15-.21-.23-.44-.23-.67h1.17c0,.19.07.32.19.41.12.09.27.13.46.13.17,0,.3-.03.39-.1.09-.07.13-.16.13-.27Z"/>
                <path className="cls-2" d="M55.42,11.04c-.62,0-1.12-.18-1.5-.55-.38-.37-.57-.85-.57-1.44v-.1c0-.41.08-.78.23-1.09s.38-.56.67-.73c.29-.17.64-.26,1.04-.26.57,0,1.01.18,1.34.53.33.35.49.84.49,1.47v.49h-2.5c.04.23.14.4.29.53.15.13.35.19.59.19.4,0,.71-.14.93-.42l.57.68c-.16.22-.38.39-.67.52-.29.13-.6.19-.93.19ZM55.28,7.83c-.37,0-.59.24-.66.73h1.27v-.1c0-.2-.05-.36-.15-.47-.11-.11-.26-.17-.46-.17Z"/>
              </g>
              <g>
                <path className="cls-2" d="M55.18,13.5v.04s.02-.04.02-.04l.54-1.51h.16l-.64,1.73h-.14l-.64-1.73h.16l.54,1.51Z"/>
                <path className="cls-2" d="M56.41,12.77h.15c.08,0,.15-.01.21-.04.06-.03.11-.07.14-.12s.05-.11.05-.17c0-.11-.03-.2-.09-.26s-.15-.09-.27-.09c-.11,0-.2.03-.27.1-.07.07-.11.15-.11.26h-.14c0-.09.02-.17.07-.25s.11-.13.19-.17c.08-.04.17-.06.27-.06.16,0,.28.04.37.13.09.09.14.2.14.35,0,.08-.03.16-.08.23-.05.07-.12.12-.22.16.11.03.19.08.24.15s.08.16.08.26c0,.15-.05.27-.14.36-.1.09-.23.14-.39.14-.1,0-.2-.02-.28-.06-.09-.04-.15-.1-.2-.17-.05-.07-.07-.16-.07-.26h.14c0,.11.04.2.12.27.08.07.18.1.3.1s.22-.03.29-.09c.07-.06.1-.15.1-.27s-.04-.2-.11-.26c-.07-.06-.18-.09-.33-.09h-.14v-.12Z"/>
              </g>
            </svg>
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