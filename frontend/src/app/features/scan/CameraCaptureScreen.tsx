import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { useTelegram } from '../../lib/telegram';
import { useScan } from './ScanContext';
import { Camera, X, RotateCw, ImagePlus, ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}

export const CameraCaptureScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { setImage } = useScan();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not supported on this device or browser.');
        setPermissionDenied(true);
        return;
      }

      stopStream(streamRef.current);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
      setPermissionDenied(false);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
        setPermissionDenied(true);
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
        setPermissionDenied(true);
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
        setPermissionDenied(true);
      } else if (name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Try using gallery instead.');
        setPermissionDenied(true);
      } else {
        setError('Unable to access camera. Please try using gallery instead.');
        setPermissionDenied(true);
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [startCamera]);

  const handleCapture = () => {
    haptic.medium();
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
              setImage(file);
              stopStream(streamRef.current);
              streamRef.current = null;
              haptic.success();
              navigate('/preview');
            }
          },
          'image/jpeg',
          0.92,
        );
      }
    }
  };

  const handleFlipCamera = () => {
    haptic.light();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleBack = () => {
    haptic.light();
    stopStream(streamRef.current);
    streamRef.current = null;
    navigate('/scan');
  };

  const handleUseGallery = () => {
    haptic.light();
    stopStream(streamRef.current);
    streamRef.current = null;
    navigate('/scan');
  };

  // Full-screen error state — replaces everything
  if (error) {
    return (
      <div className="min-h-screen-safe bg-background flex flex-col">
        {/* Header */}
        <div className="px-6 pt-safe pb-4">
          <motion.button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Camera</span>
          </motion.button>
        </div>

        {/* Error Content */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8 pb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <Camera className="w-10 h-10 text-muted-foreground" />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-2">Camera Unavailable</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8 max-w-xs">
            {error}
          </p>

          <div className="w-full max-w-xs space-y-3">
            {!permissionDenied && (
              <Button onClick={startCamera} className="w-full" size="lg">
                Try Again
              </Button>
            )}
            <Button onClick={handleUseGallery} variant="secondary" className="w-full" size="lg">
              <ImagePlus className="w-4 h-4 mr-2" />
              Use Gallery Instead
            </Button>
          </div>

          {permissionDenied && (
            <motion.p
              className="text-xs text-muted-foreground/70 mt-6 text-center leading-relaxed max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              To enable camera: Open browser settings &rarr; Site permissions &rarr; Camera &rarr; Allow
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/50 rounded-2xl" />
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between">
          <motion.button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
            aria-label="Close camera"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
          <motion.button
            onClick={handleFlipCamera}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
            aria-label="Flip camera"
          >
            <RotateCw className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe">
          <div className="flex items-center justify-center">
            <motion.button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30"
              whileTap={{ scale: 0.95 }}
              aria-label="Capture photo"
            >
              <div className="w-full h-full rounded-full bg-white" />
            </motion.button>
          </div>
          <p className="text-center text-white/70 text-xs mt-4">
            Position plant within frame
          </p>
        </div>
      </div>
    </div>
  );
};
