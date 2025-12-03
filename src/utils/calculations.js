// Calculate downtime cost
export const calculateDowntimeCost = (durationMinutes, productionValuePerMin = 30) => {
  return durationMinutes * productionValuePerMin;
};

// Calculate direct savings
export const calculateDirectSavings = (oemPrice, altPrice, annualUsage) => {
  return (oemPrice - altPrice) * annualUsage;
};

// Calculate TCO (Total Cost of Ownership)
export const calculateTCO = (machine) => {
  // Sum of all parts used + downtime costs
  return machine.total_cost || 0;
};

// Format currency
export const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Format duration
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Calculate stock status
export const getStockStatus = (current, min, reorder) => {
  if (current <= 0) return 'out';
  if (current <= min) return 'critical';
  if (current <= reorder) return 'low';
  return 'ok';
};

// Generate machine code
export const generateMachineCode = (buildingId, type, sequence) => {
  const typeCode = type.substring(0, 3).toUpperCase();
  return `B${buildingId}-${typeCode}-${String(sequence).padStart(3, '0')}`;
};