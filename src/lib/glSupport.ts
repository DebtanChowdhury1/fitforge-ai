import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Whether expo-gl can safely mount a GLView.
 *
 * Under SDK 54's New Architecture, expo-gl's native GL context cannot be
 * created inside Expo Go — `global.__EXGLContexts[id]` comes back undefined and
 * expo-gl crashes internally in `_onSurfaceCreate` with:
 *   "Cannot set property '__expoSetLogging' of undefined"
 * before our `onContextCreate` callback ever runs, so it cannot be caught.
 *
 * The native context DOES work in a dev client / production build, so we only
 * disable GL when running inside the Expo Go store client. Every GL component
 * checks this flag and renders a gradient/transparent fallback when false.
 */
export const GL_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
