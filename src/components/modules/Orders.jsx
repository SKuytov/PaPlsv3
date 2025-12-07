import React from 'react';
import OrderManagementSidebar from './quotes/OrderManagementSidebar';

/**
 * Orders Module
 * Main container for order, quote, and approval management
 * Now using the comprehensive OrderManagementSidebar with tab-based navigation
 */
const Orders = () => {
  return (
    <div className="w-full h-full">
      <OrderManagementSidebar />
    </div>
  );
};

export default Orders;
