import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as bladeController from '../controllers/bladeController.js';

const router = express.Router();

// ============================================================
// BLADE TYPES - Machine types and blade specifications
// ============================================================
router.get('/blade-types', protect, bladeController.getBladTypes);
router.get('/blade-types/:id', protect, bladeController.getBladeType);
router.post('/blade-types', protect, bladeController.createBladeType);
router.put('/blade-types/:id', protect, bladeController.updateBladeType);
router.delete('/blade-types/:id', protect, bladeController.deleteBladeType);

// ============================================================
// BLADES - Inventory management
// ============================================================
router.get('/blades', protect, bladeController.getBlades);
router.get('/blades/:id', protect, bladeController.getBlade);
router.post('/blades', protect, bladeController.createBlade);
router.put('/blades/:id', protect, bladeController.updateBlade);
router.delete('/blades/:id', protect, bladeController.deleteBlade);

// ============================================================
// BLADE SEARCH - Find blades by serial number
// ============================================================
router.get('/blades/search/:serial', protect, bladeController.searchBladeBySerial);

// ============================================================
// USAGE LOGS - Track blade usage hours and operations
// ============================================================
router.post('/blades/:id/usage-logs', protect, bladeController.logUsage);
router.get('/blades/:id/usage-logs', protect, bladeController.getUsageLogs);

// ============================================================
// SHARPENING - Maintenance and sharpening records
// ============================================================
router.post('/blades/:id/sharpen', protect, bladeController.recordSharpening);
router.get('/blades/:id/sharpening-history', protect, bladeController.getSharpeningHistory);

// ============================================================
// ALERTS - Maintenance alerts and notifications
// ============================================================
router.get('/blades/:id/alerts', protect, bladeController.getBladeAlerts);
router.post('/blades/:id/alerts/:alertId/resolve', protect, bladeController.resolveAlert);

// ============================================================
// STATISTICS - Overview and reporting
// ============================================================
router.get('/blades/stats/overview', protect, bladeController.getBladesStats);

export default router;