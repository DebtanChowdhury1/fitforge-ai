import { Platform } from 'react-native';
import { supabase } from './supabase';

const APP_VERSION = '1.0.0';
let _initialized = false;

/**
 * Installs a global error handler that logs crashes to the error_logs table.
 * Call once at the top of App.tsx before any renders.
 *
 * To add Sentry in future:
 *   npm install @sentry/react-native
 *   Sentry.init({ dsn: '...' })  ← before initMonitoring()
 *   then Sentry.captureException(error) inside the handler below.
 */
export function initMonitoring(): void {
  if (_initialized) return;
  _initialized = true;

  const errorUtils = (global as any).ErrorUtils;
  if (!errorUtils) return;

  const originalHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler(async (error: Error, isFatal?: boolean) => {
    try {
      await supabase.from('error_logs').insert({
        message: error?.message ?? 'Unknown error',
        stack: error?.stack?.slice(0, 3000) ?? null,
        is_fatal: isFatal ?? false,
        platform: Platform.OS,
        app_version: APP_VERSION,
        occurred_at: new Date().toISOString(),
      });
    } catch {
      // Monitoring must never crash the app
    }
    originalHandler?.(error, isFatal);
  });
}
