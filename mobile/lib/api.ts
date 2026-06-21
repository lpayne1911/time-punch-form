import * as SecureStore from "expo-secure-store";
import { API_URL, CLIENT_HEADER } from "./config";
import type {
  BillingData,
  Candidate,
  EventsData,
  Interval,
  ItemKind,
  LikeResult,
  LikesData,
  Me,
  MatchRow,
  ReportCategory,
  RsvpStatus,
  SettingsData,
  ThreadData,
  ThreadMessage,
  Tier,
  Visibility,
} from "./types";

const TOKEN_KEY = "velvet.session.token";

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Structured error so screens can react to status / upgrade prompts. */
export class ApiError extends Error {
  status: number;
  code?: string;
  upgrade?: string;
  constructor(status: number, message: string, opts?: { code?: string; upgrade?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = opts?.code;
    this.upgrade = opts?.upgrade;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
  auth?: boolean;
};

function buildQuery(query?: Record<string, string | undefined>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  // NOTE: avoid `new URL` / `URLSearchParams` — unreliable under Hermes.
  const url = API_URL + path + buildQuery(query);

  const headers: Record<string, string> = { ...CLIENT_HEADER };
  if (body != null) headers["content-type"] = "application/json";
  if (auth) {
    const token = await getToken();
    if (token) headers["authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach Velvet. Check your connection and try again.");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Something went wrong (${res.status}).`;
    throw new ApiError(res.status, message, {
      code: data?.error,
      upgrade: data?.upgrade,
    });
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ----------------------------- Endpoints ------------------------------ */

export const api = {
  /** Request a 6-digit login code by email (passwordless). */
  requestCode(email: string): Promise<{ ok: true; devCode?: string }> {
    return request("/api/auth/request", { method: "POST", body: { email }, auth: false });
  },

  /** Verify the code; on success persists and returns the session token. */
  async verifyCode(email: string, code: string): Promise<{ next: string }> {
    const res = await request<{ ok: true; next: string; token?: string }>("/api/auth/verify", {
      method: "POST",
      body: { email, code },
      auth: false,
    });
    if (res.token) await setToken(res.token);
    return { next: res.next };
  },

  me(): Promise<Me> {
    return request<Me>("/api/me");
  },

  discover(filters?: {
    intention?: string;
    experience?: string;
    verifiedOnly?: boolean;
  }): Promise<{ candidates: Candidate[] }> {
    return request("/api/discover", {
      query: {
        intention: filters?.intention,
        experience: filters?.experience,
        verifiedOnly: filters?.verifiedOnly ? "1" : undefined,
      },
    });
  },

  like(toUserId: string): Promise<LikeResult> {
    return request("/api/like", { method: "POST", body: { toUserId } });
  },

  superlike(toUserId: string): Promise<LikeResult> {
    return request("/api/superlike", { method: "POST", body: { toUserId } });
  },

  /* ----- Likes ----- */
  likes(): Promise<LikesData> {
    return request("/api/likes");
  },

  /* ----- Matches & messages ----- */
  matches(): Promise<{ matches: MatchRow[] }> {
    return request("/api/matches");
  },
  thread(matchId: string): Promise<ThreadData> {
    return request(`/api/messages/${encodeURIComponent(matchId)}`);
  },
  sendMessage(
    matchId: string,
    body: string,
  ): Promise<{ ok: true; message: ThreadMessage; nudgeContactInfo: boolean; heldForReview: boolean }> {
    return request("/api/message", { method: "POST", body: { matchId, body } });
  },
  matchAction(
    matchId: string,
    action: "extend" | "pause" | "resume" | "reveal" | "aftercare",
    answer?: "respectful" | "not",
  ): Promise<{ ok: true }> {
    return request("/api/match", { method: "POST", body: { matchId, action, answer } });
  },

  /* ----- Events ----- */
  events(): Promise<EventsData> {
    return request("/api/events");
  },
  rsvp(eventId: string, action: "rsvp" | "cancel"): Promise<{ ok: true; status: RsvpStatus }> {
    return request("/api/events/rsvp", { method: "POST", body: { eventId, action } });
  },

  /* ----- Billing / premium ----- */
  billing(): Promise<BillingData> {
    return request("/api/billing");
  },
  subscribe(tier: Tier, interval: Interval): Promise<{ ok: true }> {
    return request("/api/billing/subscribe", { method: "POST", body: { tier, interval } });
  },
  purchase(kind: ItemKind): Promise<{ ok: true }> {
    return request("/api/billing/purchase", { method: "POST", body: { kind } });
  },

  /* ----- Settings & safety ----- */
  settings(): Promise<SettingsData> {
    return request("/api/settings");
  },
  updateSetting(key: string, value: boolean | Visibility): Promise<{ ok: true }> {
    return request("/api/settings", { method: "POST", body: { key, value } });
  },
  report(reportedId: string, category: ReportCategory, detail?: string): Promise<{ ok: true }> {
    return request("/api/report", { method: "POST", body: { reportedId, category, detail } });
  },
  block(blockedId: string): Promise<{ ok: true }> {
    return request("/api/block", { method: "POST", body: { blockedId } });
  },

  async signOut(): Promise<void> {
    await setToken(null);
  },
};
