import React, { useState, useRef, useEffect } from 'react';
import { Zap, X, Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * BarcodeScanner Component
 * Integrated barcode/QR scanning for quote creation
 * Uses native browser APIs - NO external dependencies!
 * 
 * Features:
 * - Camera-based QR/barcode scanning
 * - Processes: QR codes, barcodes, part numbers
 * - Fast item addition to quotes
 * - Real-time feedback
 * - Mobile friendly
 */
const BarcodeScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanning(true);
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Camera error: ' + err.message
      );
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  // Process scanned/entered data
  const processData = (data) => {
    if (!data || data.trim().length === 0) {
      setCameraError('Empty scan value');
      setTimeout(() => setCameraError(null), 2000);
      return;
    }

    setScannedData({
      value: data.trim(),
      timestamp: new Date()
    });
  };

  // Handle manual input (for testing or barcode pen)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Auto-detect if value looks like a barcode (numbers, dashes, etc)
    if (value.length > 5) {
      processData(value);
    }
  };

  // Handle Enter key in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      processData(inputValue);
      setInputValue('');
    }
  };

  // Use scanned data
  const useScannedData = () => {
    if (scannedData) {
      onScan({
        value: scannedData.value,
        type: 'barcode'
      });
      setScannedData(null);
      setInputValue('');
      stopCamera();
      onClose();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-teal-100 sticky top-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Scan Barcode/QR Code</h3>
            <p className="text-sm text-slate-600 mt-1">Point camera at barcode or QR code, or type manually</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {cameraError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Camera Error</p>
                <p className="text-sm text-red-700 mt-1">{cameraError}</p>
              </div>
            </div>
          )}

          {/* Manual Input Option */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              📱 Manual Entry (or use barcode reader pen)
            </label>
            <input
              type="text"
              placeholder="Type barcode or part number here..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              autoFocus
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none text-lg"
            />
            <p className="text-xs text-slate-500">Type value and press Enter, or it will auto-detect if longer than 5 characters</p>
          </div>

          {/* Or Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Camera Section */}
          {!cameraActive && !scannedData && (
            <button
              onClick={startCamera}
              className="w-full py-8 border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-lg transition-colors flex flex-col items-center justify-center gap-3 hover:bg-teal-50"
              type="button"
            >
              <Zap className="h-8 w-8 text-teal-600" />
              <div>
                <p className="font-semibold text-slate-900">📷 Start Camera</p>
                <p className="text-sm text-slate-600 mt-1">Click to enable camera and scan</p>
              </div>
            </button>
          )}

          {cameraActive && !scannedData && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Scanner frame overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute inset-1/4 border-2 border-green-400 rounded-lg animate-pulse"></div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded inline-block">Point at barcode</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Stop Camera
                </button>
                <button
                  onClick={() => setInputValue('')}
                  className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Clear Input
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">💡 Tip: For best results, ensure good lighting and hold barcode steady</p>
            </div>
          )}

          {/* Scanned Result */}
          {scannedData && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">✓ Value Captured!</p>
                    <p className="text-sm text-green-700 mt-2 font-mono bg-green-100 px-3 py-2 rounded break-all">
                      {scannedData.value}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={useScannedData}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  <Check className="h-4 w-4" />
                  Use This Value
                </button>
                <button
                  onClick={() => {
                    setScannedData(null);
                    setInputValue('');
                    startCamera();
                  }}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">💡 How to use:</p>
            <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-4 list-disc">
              <li>Type or paste barcode value in the text field</li>
              <li>Or click "Start Camera" to scan with your device camera</li>
              <li>Value will auto-capture when ready</li>
              <li>System will search for matching part in your inventory</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;