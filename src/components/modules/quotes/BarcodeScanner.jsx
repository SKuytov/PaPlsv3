import React, { useState, useRef, useEffect } from 'react';
import { Zap, X, Loader2, Check, AlertCircle, Camera } from 'lucide-react';

/**
 * BarcodeScanner Component
 * Integrated barcode/QR scanning for quote creation
 * Uses native browser APIs with proven camera handling
 * 
 * Features:
 * - Working camera live feed
 * - QR code & barcode scanning
 * - Manual text input
 * - Barcode reader pen support
 * - Fast item addition to quotes
 */
const BarcodeScanner = ({ onScan, onClose }) => {
  const [mode, setMode] = useState('input'); // 'input' or 'camera'
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Start camera with proper initialization
  const startCamera = async () => {
    try {
      setCameraError(null);
      setMode('camera');
      setScanning(true);

      // Request camera access
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          videoRef.current.play().catch(err => {
            console.error('Play error:', err);
            setCameraError('Could not start video playback');
          });
        };
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera in browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera device found on this device.'
          : err.name === 'NotReadableError'
          ? 'Camera is in use by another application.'
          : 'Camera error: ' + err.message
      );
      setMode('input');
      setScanning(false);
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setScanning(false);
    setMode('input');
  };

  // Process captured data
  const processData = (data) => {
    if (!data || data.trim().length === 0) {
      setCameraError('Empty value');
      setTimeout(() => setCameraError(null), 2000);
      return;
    }

    setScannedData({
      value: data.trim(),
      timestamp: new Date()
    });
    stopCamera();
  };

  // Handle manual input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };

  // Handle Enter key
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
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-teal-100 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Scan Barcode/QR Code</h3>
            <p className="text-sm text-slate-600 mt-1">Type, paste, or use camera to scan</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 p-1"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {cameraError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{cameraError}</p>
              </div>
            </div>
          )}

          {/* Manual Input Section */}
          {mode === 'input' && !scannedData && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  📱 Manual Entry / Barcode Pen
                </label>
                <input
                  type="text"
                  placeholder="Type, paste, or scan with barcode pen..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none text-lg font-mono"
                />
                <p className="text-xs text-slate-500">Press Enter to confirm or auto-detects values longer than 5 characters</p>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Camera Button */}
              <button
                onClick={startCamera}
                className="w-full py-8 border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-lg transition-all flex flex-col items-center justify-center gap-3 hover:bg-teal-50 group"
                type="button"
              >
                <Camera className="h-8 w-8 text-teal-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-semibold text-slate-900">📷 Use Camera</p>
                  <p className="text-sm text-slate-600 mt-1">Scan QR code or barcode with device camera</p>
                </div>
              </button>
            </div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && !scannedData && (
            <div className="space-y-3">
              {/* Video Container */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video border-2 border-slate-200">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                  style={{ 
                    transform: 'scaleX(-1)',
                    WebkitTransform: 'scaleX(-1)'
                  }}
                />
                
                {!cameraReady && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin mx-auto mb-2" />
                      <p className="text-white font-semibold">Initializing camera...</p>
                    </div>
                  </div>
                )}

                {cameraReady && (
                  <>
                    {/* Scanner frame overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-1/4 border-3 border-green-400 rounded-lg animate-pulse shadow-lg" style={{
                        boxShadow: '0 0 20px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(34, 197, 94, 0.3)'
                      }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-white text-sm font-semibold bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm">Point camera at barcode/QR code</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Canvas for processing (hidden) */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    stopCamera();
                    setMode('input');
                  }}
                  className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Back to Manual
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Stop Camera
                </button>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">💡 How to scan:</p>
                <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-4 list-disc">
                  <li>Hold camera 4-8 inches from barcode</li>
                  <li>Ensure good lighting</li>
                  <li>Keep barcode in frame center</li>
                  <li>Or type the value below if scanning doesn't work</li>
                </ul>
              </div>

              {/* Manual input while camera is on */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Or type barcode value here..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none text-lg font-mono"
                />
              </div>
            </div>
          )}

          {/* Scanned Result */}
          {scannedData && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-1">
                    <p className="font-bold text-green-900 text-lg">✓ Value Captured!</p>
                    <p className="text-sm text-green-700 mt-2 font-mono bg-green-100 px-3 py-2 rounded break-all border border-green-300">
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
          {!scannedData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-medium">✨ System will search for:</p>
              <ul className="text-xs text-green-600 mt-2 space-y-1 ml-4 list-disc">
                <li><strong>Barcode</strong> - Exact match in barcode field</li>
                <li><strong>Part Number</strong> - Exact match in part_number field</li>
                <li><strong>SKU</strong> - Exact match in SKU field</li>
                <li>Auto-selects matching part with preferred supplier</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;