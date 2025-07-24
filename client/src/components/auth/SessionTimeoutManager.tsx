import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';

const APP_INACTIVITY_TIMEOUT = 90 * 60 * 1000; // 90 minutes
const SYSTEM_IDLE_TIMEOUT = 30 * 60 * 1000;    // 30 minutes
const WARNING_TIME = 5 * 60 * 1000;            // 5 minutes warning
const BACKEND_UPDATE_INTERVAL = 2 * 60 * 1000;  // 2 minutes

export function SessionTimeoutManager() {
  const { isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeoutReason, setTimeoutReason] = useState<'app' | 'system' | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const lastActivityRef = useRef(Date.now());
  const lastSystemActivityRef = useRef(Date.now());
  const lastBackendUpdateRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();
  const warningIntervalRef = useRef<NodeJS.Timeout>();

  const handleTimeout = useCallback(() => {
    // Force logout by redirecting to logout endpoint
    window.location.href = '/api/logout';
  }, []);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    updateBackend();
  }, []);

  const updateSystemActivity = useCallback(() => {
    lastSystemActivityRef.current = Date.now();
  }, []);

  const updateBackend = useCallback(() => {
    const now = Date.now();
    if (now - lastBackendUpdateRef.current > BACKEND_UPDATE_INTERVAL) {
      lastBackendUpdateRef.current = now;
      fetch('/api/auth/activity', {
        method: 'POST',
        credentials: 'include',
      }).catch(error => {
        console.error('Failed to update backend activity:', error);
      });
    }
  }, []);

  // Setup activity detection
  useEffect(() => {
    if (!isAuthenticated) return;

    // App activity events
    const appEvents = ['click', 'keydown', 'scroll', 'mousedown'];
    const handleAppActivity = () => updateActivity();

    // System activity events
    const systemEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleSystemActivity = () => updateSystemActivity();

    // Page visibility events
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSystemActivity();
      }
    };

    // Add event listeners
    appEvents.forEach(event => {
      document.addEventListener(event, handleAppActivity, true);
    });

    systemEvents.forEach(event => {
      document.addEventListener(event, handleSystemActivity, true);
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleSystemActivity);

    return () => {
      appEvents.forEach(event => {
        document.removeEventListener(event, handleAppActivity, true);
      });
      systemEvents.forEach(event => {
        document.removeEventListener(event, handleSystemActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleSystemActivity);
    };
  }, [isAuthenticated, updateActivity, updateSystemActivity]);

  // Main timeout check
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceAppActivity = now - lastActivityRef.current;
      const timeSinceSystemActivity = now - lastSystemActivityRef.current;

      // Check for actual timeout
      if (timeSinceAppActivity >= APP_INACTIVITY_TIMEOUT || 
          timeSinceSystemActivity >= SYSTEM_IDLE_TIMEOUT) {
        handleTimeout();
        return;
      }

      // Check for warning
      const appTimeRemaining = APP_INACTIVITY_TIMEOUT - timeSinceAppActivity;
      const systemTimeRemaining = SYSTEM_IDLE_TIMEOUT - timeSinceSystemActivity;
      
      const showAppWarning = appTimeRemaining <= WARNING_TIME && appTimeRemaining > 0;
      const showSystemWarning = systemTimeRemaining <= WARNING_TIME && systemTimeRemaining > 0;
      
      if (showAppWarning || showSystemWarning) {
        const timeRemaining = Math.min(appTimeRemaining, systemTimeRemaining);
        setCountdown(Math.max(0, Math.ceil(timeRemaining / 1000)));
        setTimeoutReason(appTimeRemaining < systemTimeRemaining ? 'app' : 'system');
        setShowWarning(true);
      } else {
        setShowWarning(false);
        setTimeoutReason(null);
      }
    };

    // Check every 10 seconds
    intervalRef.current = setInterval(checkTimeout, 10000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, handleTimeout]);

  // Update countdown every second when warning is shown
  useEffect(() => {
    if (showWarning) {
      warningIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    }

    return () => {
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    };
  }, [showWarning, handleTimeout]);

  const extendSession = () => {
    updateActivity();
    updateSystemActivity();
    setShowWarning(false);
    setTimeoutReason(null);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated || !showWarning) {
    return null;
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {timeoutReason === 'app' ? (
                <>
                  Your session will expire due to <strong>app inactivity</strong> in{' '}
                  <span className="font-mono font-bold">{formatTime(countdown)}</span>
                </>
              ) : (
                <>
                  Your session will expire due to <strong>system idle time</strong> in{' '}
                  <span className="font-mono font-bold">{formatTime(countdown)}</span>
                </>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600">
            <p>For security reasons, your session will automatically end if:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>You haven't used the app for 90 minutes</li>
              <li>Your computer has been idle for 30 minutes</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleTimeout}>
              Logout Now
            </Button>
            <Button onClick={extendSession}>
              Stay Logged In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}