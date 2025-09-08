import React from 'react';
import { useWebSocket } from '@/components/ui/websocket';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  className?: string;
}

export default function WebSocketStatus({ className }: WebSocketStatusProps) {
  const { connected, lastEvent } = useWebSocket();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {connected ? (
        <Badge variant="outline" className="gap-1 py-1 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Wifi className="h-3 w-3" />
          <span>Live updates</span>
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 py-1 text-xs bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
          <WifiOff className="h-3 w-3" />
          <span>Connecting...</span>
        </Badge>
      )}
    </div>
  );
}