import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface SessionTimeoutOptions {
  appInactivityTimeout: number; // 90 minutes in milliseconds
  systemIdleTimeout: number;    // 30 minutes in milliseconds
  onTimeout: () => void;
}

export function useSessionTimeout(options: SessionTimeoutOptions) {
  const { isAuthenticated } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const lastSystemActivityRef = useRef(Date.now());
  const timeoutCheckIntervalRef = useRef<NodeJS.Timeout>();
  const systemIdleCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastBackendUpdateRef = useRef(Date.now());

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const updateSystemActivity = useCallback(() => {
    lastSystemActivityRef.current = Date.now();
  }, []);

  const throttledBackendUpdate = useCallback(() => {
    const now = Date.now();
    // Only update backend every 2 minutes to avoid excessive API calls
    if (now - lastBackendUpdateRef.current > 120000) {
      lastBackendUpdateRef.current = now;
      fetch('/api/auth/activity', {
        method: 'POST',
        credentials: 'include',
      }).catch(error => {
        console.error('Failed to update backend activity:', error);
      });
    }
  }, []);

  const checkForTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeSinceLastSystemActivity = now - lastSystemActivityRef.current;

    // Check app inactivity (90 minutes)
    if (timeSinceLastActivity >= options.appInactivityTimeout) {
      console.log('Session timeout: App inactivity for 90 minutes');
      options.onTimeout();
      return;
    }

    // Check system idle (30 minutes)
    if (timeSinceLastSystemActivity >= options.systemIdleTimeout) {
      console.log('Session timeout: System idle for 30 minutes');
      options.onTimeout();
      return;
    }
  }, [isAuthenticated, options]);

  const setupSystemIdleDetection = useCallback(() => {
    // Track system-level activity (mouse, keyboard, touch)
    const systemEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleSystemActivity = () => {
      updateSystemActivity();
    };

    // Add event listeners to detect system activity
    systemEvents.forEach(event => {
      document.addEventListener(event, handleSystemActivity, true);
    });

    // Also track focus/blur to detect when user switches windows
    window.addEventListener('focus', handleSystemActivity);
    window.addEventListener('blur', () => {
      // Don't update activity on blur, but track that they left
      // This helps detect when user is away from computer
    });

    return () => {
      systemEvents.forEach(event => {
        document.removeEventListener(event, handleSystemActivity, true);
      });
      window.removeEventListener('focus', handleSystemActivity);
    };
  }, [updateSystemActivity]);

  const setupAppActivityDetection = useCallback(() => {
    // Track app-specific activity (API calls, navigation, interactions)
    const appEvents = ['click', 'keydown', 'scroll', 'mousedown'];
    
    const handleAppActivity = () => {
      updateActivity();
      // Also send activity update to backend (throttled)
      throttledBackendUpdate();
    };

    appEvents.forEach(event => {
      document.addEventListener(event, handleAppActivity, true);
    });

    // Track navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      updateActivity();
      throttledBackendUpdate();
      return originalPushState.apply(history, args);
    };
    
    history.replaceState = function(...args) {
      updateActivity();
      throttledBackendUpdate();
      return originalReplaceState.apply(history, args);
    };

    window.addEventListener('popstate', handleAppActivity);

    return () => {
      appEvents.forEach(event => {
        document.removeEventListener(event, handleAppActivity, true);
      });
      window.removeEventListener('popstate', handleAppActivity);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [updateActivity]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timeouts when not authenticated
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
      if (systemIdleCheckIntervalRef.current) {
        clearInterval(systemIdleCheckIntervalRef.current);
      }
      return;
    }

    // Reset activity timestamps when user logs in
    lastActivityRef.current = Date.now();
    lastSystemActivityRef.current = Date.now();

    // Setup activity detection
    const cleanupAppActivity = setupAppActivityDetection();
    const cleanupSystemActivity = setupSystemIdleDetection();

    // Check for timeouts every minute
    timeoutCheckIntervalRef.current = setInterval(checkForTimeout, 60000);

    return () => {
      cleanupAppActivity();
      cleanupSystemActivity();
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
    };
  }, [isAuthenticated, setupAppActivityDetection, setupSystemIdleDetection, checkForTimeout]);

  // Return methods to manually update activity (for API calls, etc.)
  return {
    updateActivity,
    updateSystemActivity,
    getLastActivity: () => lastActivityRef.current,
    getLastSystemActivity: () => lastSystemActivityRef.current,
  };
}