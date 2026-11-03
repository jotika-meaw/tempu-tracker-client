export type Direction = "outbound" | "return";

export type RouteConfidence = "verified" | "partial";

export type StoreMode = "mongodb" | "memory" | "memory-fallback" | "unavailable";

export type StoreHealth = {
  configured: boolean;
  connected: boolean;
  mode: StoreMode;
  persistent: boolean;
  latencyMs: number | null;
  errorCode: string | null;
};

export type AiHealth = {
  configured: boolean;
  model: string;
  baseUrl: string;
};

export type HealthResponse = {
  status: "ok" | "degraded" | "unavailable";
  time: string;
  services: {
    api: { status: "ok" };
    database: StoreHealth;
    ai: AiHealth;
  };
};

export type PublicVehicle = {
  publicId: string;
  routeNumber: string;
  routeName: string;
  direction: Direction;
  startStop: string;
  endStop: string;
  segmentStops: string[];
  latitude: number;
  longitude: number;
  accuracy: number | null;
  lastLocationAt: string;
  ageSeconds: number;
  freshness: "live";
  source: "driver-device-gps";
};

export type ActiveVehiclesResponse = {
  serverTime: string;
  staleSeconds: number;
  staleHidden: number;
  vehicles: PublicVehicle[];
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type StartTrackingInput = {
  routeNumber: string;
  direction: Direction;
  startIndex: number;
  endIndex: number;
  consent: true;
  initialLocation: LocationPayload;
};

export type StartedJourney = {
  routeNumber: string;
  routeName: string;
  direction: Direction;
  startIndex: number;
  endIndex: number;
  startStop: string;
  endStop: string;
  segmentStops: string[];
  confidence: RouteConfidence;
  via: string[];
  note: string | null;
};

export type StartTrackingResponse = {
  sessionToken: string;
  publicId: string;
  journey: StartedJourney;
  startedAt: string;
  expiresAt: string;
  staleSeconds: number;
};

export type LocationAcceptedResponse = {
  accepted: true;
  vehicle: PublicVehicle;
};

export type AiLanguage = "bn" | "en" | "ctg";

export type AiResponse = {
  answer: string;
  model: string;
};
