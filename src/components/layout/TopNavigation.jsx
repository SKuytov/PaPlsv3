import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Bell, User, LogOut, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { dbService } from '@/lib/supabase';
import { supabase } from '@/lib/customSupabaseClient';

const TopNavigation = ({
  onMenuClick,
  userName,
  userRole
}) => {
  const navigate = useNavigate();
  const { signOut: authSignOut, user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    const { data } = await dbService.getNotifications(user.id);
    if (data) setNotifications(data);
  };

  const handleSignOut = async () => {
    try {
      console.log('🔄 Starting sign out...');
      
      // Close menu first
      setShowProfile(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      // Also call AuthContext signOut if it exists
      if (authSignOut) {
        await authSignOut();
      }
      
      console.log('✅ Successfully signed out');
      
      // Navigate to login
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('❌ Sign out failed:', error.message);
      // Force redirect even if error
      navigate('/login', { replace: true });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-2 rounded-lg">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">PartPulse</h1>
              <p className="text-xs text-slate-500">V3</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="hidden sm:block border-r border-slate-200 pr-4">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="relative" title={t('common.notifications')}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>}
              </Button>
              
              {showNotifications && <motion.div initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800 mb-3">{t('navigation.notifications') || 'Notifications'}</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? <p className="text-sm text-slate-500">{t('common.noData')}</p> : notifications.map(notif => <div key={notif.id} className={`p-3 rounded-lg ${notif.is_read ? 'bg-slate-50' : 'bg-teal-50'}`}>
                          <p className="text-sm font-medium text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                        </div>)}
                  </div>
                </motion.div>}
            </div>

            <div className="relative">
              <Button variant="ghost" onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 min-w-44 justify-start">
                <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-2 rounded-full">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">{userName}</p>
                  <p className="text-xs text-slate-500">{userRole}</p>
                </div>
              </Button>

              {showProfile && <motion.div initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-4">
                  <Button 
                    variant="ghost" 
                    onClick={handleSignOut} 
                    className="w-full justify-start text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('navigation.logout')}
                  </Button>
                </motion.div>}
            </div>
          </div>
        </div>
      </div>
    </nav>;
};

export default TopNavigation;