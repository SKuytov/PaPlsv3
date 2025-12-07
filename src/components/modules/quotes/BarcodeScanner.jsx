import React, { useState, useRef, useEffect } from 'react';
import { Zap, X, Loader2, Check, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

/**
 * BarcodeScanner Component
 * Integrated barcode/QR scanning for quote creation
 * 
 * Features:
 * - Camera-based QR/barcode scanning
 * - Processes: QR codes, barcodes, part numbers, SKUs
 * - Fast item addition to quotes
 * - Auto-quantity setting
 * - Real-time feedback
 */
const BarcodeScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationIdRef = useRef(null);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Back camera for mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanning(true);
        startScanning();
      }
    } catch (err) {
      setCameraError('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    setCameraActive(false);
    setScanning(false);
  };

  // Scan for QR/barcode
  const startScanning = () => {
    const scan = () => {
      if (videoRef.current && canvasRef.current && scanning) {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          // Found QR code
          setScannedData({
            type: 'qr',
            value: code.data,
            timestamp: new Date()
          });
          stopCamera();
          return;
        }
      }

      if (scanning) {
        animationIdRef.current = requestAnimationFrame(scan);
      }
    };

    animationIdRef.current = requestAnimationFrame(scan);
  };

  // Process scanned data
  const processScannedData = (data) => {
    // Could be: barcode, QR code, part number, SKU
    // Return it to parent for processing
    onScan({
      value: data,
      type: 'barcode' // Could be barcode, QR, part_number, or sku
    });
    setScannedData(null);
    stopCamera();
    onClose();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-teal-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Scan Barcode/QR Code</h3>
            <p className="text-sm text-slate-600 mt-1">Point camera at barcode or QR code</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scanner Content */}
        <div className="p-4 space-y-4">
          {cameraError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Camera Error</p>
                <p className="text-sm text-red-700">{cameraError}</p>
              </div>
            </div>
          )}

          {!cameraActive && !scannedData && (
            <button
              onClick={startCamera}
              className="w-full py-12 border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-lg transition-colors flex flex-col items-center justify-center gap-3 hover:bg-teal-50"
            >
              <Zap className="h-8 w-8 text-teal-600" />
              <div>
                <p className="font-semibold text-slate-900">Start Camera</p>
                <p className="text-sm text-slate-600">Click to enable camera and scan</p>
              </div>
            </button>
          )}

          {cameraActive && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {/* Scanner frame overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-2 border-transparent">
                    <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-green-400 rounded-lg"></div>
                  </div>
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Stop Camera
              </button>
            </div>
          )}

          {scannedData && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Scanned Successfully!</p>
                    <p className="text-sm text-green-700 mt-1 font-mono">{scannedData.value}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => processScannedData(scannedData.value)}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors"
              >
                Use This Item
              </button>
              <button
                onClick={() => {
                  setScannedData(null);
                  startCamera();
                }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
              >
                Scan Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;