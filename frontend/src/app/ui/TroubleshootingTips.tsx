import { AlertCircle } from 'lucide-react';

interface TroubleshootingTipsProps {
  issue: 'camera' | 'permissions';
}

export const TroubleshootingTips = ({ issue }: TroubleshootingTipsProps) => {
  const tips = {
    camera: [
      'Ensure you\'re using HTTPS or localhost',
      'Check if another app is using the camera',
      'Try refreshing the page',
      'Clear browser cache and reload',
      'Use the gallery option instead',
    ],
    permissions: [
      'Click the lock icon in the address bar',
      'Find "Camera" in site permissions',
      'Select "Allow" for camera access',
      'Refresh the page after granting permission',
      'On mobile: Check system settings → Browser → Permissions',
    ],
  };

  return (
    <div className="rounded-lg bg-muted/50 p-4 text-left">
      <div className="flex gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <h4 className="text-xs font-medium">Troubleshooting</h4>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 ml-6">
        {tips[issue].map((tip, i) => (
          <li key={i}>• {tip}</li>
        ))}
      </ul>
    </div>
  );
};
