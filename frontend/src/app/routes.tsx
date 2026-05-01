import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { AnimatedOutlet } from './ui/AnimatedOutlet';

const OnboardingScreen = lazy(() => import('./features/onboarding/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })));
const HomeScreen = lazy(() => import('./features/home/HomeScreen').then(m => ({ default: m.HomeScreen })));
const ScanOptionsScreen = lazy(() => import('./features/scan/ScanOptionsScreen').then(m => ({ default: m.ScanOptionsScreen })));
const CameraCaptureScreen = lazy(() => import('./features/scan/CameraCaptureScreen').then(m => ({ default: m.CameraCaptureScreen })));
const PhotoPreviewScreen = lazy(() => import('./features/scan/PhotoPreviewScreen').then(m => ({ default: m.PhotoPreviewScreen })));
const AnalysisLoadingScreen = lazy(() => import('./features/scan/AnalysisLoadingScreen').then(m => ({ default: m.AnalysisLoadingScreen })));
const ResultScreen = lazy(() => import('./features/result/ResultScreen').then(m => ({ default: m.ResultScreen })));
const HistoryScreen = lazy(() => import('./features/history/HistoryScreen').then(m => ({ default: m.HistoryScreen })));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>;
}

const isOnboardingCompleted = () => {
  return localStorage.getItem('onboarding_completed') === 'true';
};

const RootRedirect = () => {
  return isOnboardingCompleted() ? (
    <Navigate to="/home" replace />
  ) : (
    <Navigate to="/onboarding" replace />
  );
};

function AnimatedLayout() {
  return <AnimatedOutlet />;
}

export const router = createBrowserRouter([
  {
    element: <AnimatedLayout />,
    children: [
      {
        path: '/',
        element: <RootRedirect />,
      },
      {
        path: '/onboarding',
        element: <Lazy><OnboardingScreen /></Lazy>,
      },
      {
        path: '/home',
        element: <Lazy><HomeScreen /></Lazy>,
      },
      {
        path: '/scan',
        element: <Lazy><ScanOptionsScreen /></Lazy>,
      },
      {
        path: '/capture',
        element: <Lazy><CameraCaptureScreen /></Lazy>,
      },
      {
        path: '/preview',
        element: <Lazy><PhotoPreviewScreen /></Lazy>,
      },
      {
        path: '/analysis/loading',
        element: <Lazy><AnalysisLoadingScreen /></Lazy>,
      },
      {
        path: '/result/:id',
        element: <Lazy><ResultScreen /></Lazy>,
      },
      {
        path: '/history',
        element: <Lazy><HistoryScreen /></Lazy>,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
