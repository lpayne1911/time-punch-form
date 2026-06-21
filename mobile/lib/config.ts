import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL of the Velvet API (the existing Next.js app). Override per
 * environment with the EXPO_PUBLIC_API_URL env var (e.g. in an .env.local or
 * EAS build secret).
 *
 * For local development against `next dev -p 3000`:
 *   - iOS simulator can reach the host via http://localhost:3000
 *   - Android emulator must use the special host alias http://10.0.2.2:3000
 *   - A physical device must use the dev machine's LAN IP, which we infer from
 *     the Expo dev server host when no explicit URL is provided.
 */
function inferDevApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, "");

  // hostUri looks like "192.168.1.20:8081" while running `expo start`.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];

  if (Platform.OS === "android" && (!host || host === "localhost" || host === "127.0.0.1")) {
    return "http://10.0.2.2:3000";
  }
  if (host) return `http://${host}:3000`;
  return "http://localhost:3000";
}

export const API_URL = inferDevApiUrl();

// Identifies this client to the API so auth can return a bearer token instead
// of relying on an httpOnly cookie (see velvet/src/app/api/auth/verify).
export const CLIENT_HEADER = { "x-velvet-client": "native" } as const;
