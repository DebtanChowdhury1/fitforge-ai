/**
 * Thin analytics wrapper. Call analytics.init(provider) in App.tsx to plug in
 * PostHog, Amplitude, or any other provider. Events are console-logged in dev.
 *
 * Usage:
 *   analytics.track('workout_logged', { plan_type: 'roadmap', duration_min: 45 });
 */

export type AnalyticsEvent =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'plan_created'
  | 'plan_regenerated'
  | 'plan_modified'
  | 'workout_started'
  | 'workout_logged'
  | 'workout_abandoned'
  | 'ai_message_sent'
  | 'day_logged'
  | 'report_generated'
  | 'insights_viewed'
  | 'account_deleted';

export type EventProperties = Record<string, string | number | boolean | null | undefined>;
type ProviderFn = (event: string, properties: EventProperties) => void;

let _provider: ProviderFn | null = null;

export const analytics = {
  /**
   * Register a provider (e.g. PostHog, Amplitude).
   * Call once in App.tsx before any screens mount.
   *
   * Example with PostHog:
   *   import PostHog from 'posthog-react-native';
   *   analytics.init((event, props) => PostHog.capture(event, props));
   */
  init(provider: ProviderFn): void {
    _provider = provider;
  },

  track(event: AnalyticsEvent, properties: EventProperties = {}): void {
    const payload = { ...properties, timestamp: Date.now() };
    if (__DEV__) console.log('[Analytics]', event, payload);
    _provider?.(event, payload);
  },
};
