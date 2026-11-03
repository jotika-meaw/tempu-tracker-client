import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchActiveVehicles } from "./api/client";
import type {
  ActiveVehiclesResponse,
  PublicVehicle,
} from "./api/types";
import { tempuRoutes } from "./routes";
import {
  formatAge,
  formatTime,
  t,
  type UiLanguage,
} from "./i18n";
import {
  classifyFreshness,
  estimateAgeSeconds,
} from "./lib/freshness";
import { describeApiError } from "./lib/errors";
import { Banner } from "./components/Banner";

type Snapshot = {
  response: ActiveVehiclesResponse;
  fetchedAt: number;
};

type VehicleWithAge = PublicVehicle & {
  currentAge: number;
};

const CHATTOGRAM_CENTER: [number, number] = [22.3569, 91.7832];

function createVehicleIcon(routeNumber: string): L.DivIcon {
  const safeNumber = routeNumber.replace(/[^0-9]/g, "");
  return L.divIcon({
    className: "tempu-marker",
    html: `<span class="tempu-marker-badge">${safeNumber}</span><span class="tempu-marker-van" aria-hidden="true">🚐</span>`,
    iconSize: [58, 36],
    iconAnchor: [29, 18],
    popupAnchor: [0, -20],
  });
}

function FollowVehicles({
  vehicles,
  filterKey,
}: {
  vehicles: VehicleWithAge[];
  filterKey: string;
}) {
  const map = useMap();
  const fittedKeyRef = useRef("");

  useEffect(() => {
    const key = `${filterKey}:${vehicles
      .map((vehicle) => vehicle.publicId)
      .sort()
      .join(",")}`;

    if (key === fittedKeyRef.current) return;
    fittedKeyRef.current = key;

    if (vehicles.length === 0) return;

    if (vehicles.length === 1) {
      map.setView([vehicles[0].latitude, vehicles[0].longitude], 15, {
        animate: false,
      });
      return;
    }

    const bounds = L.latLngBounds(
      vehicles.map((vehicle) => [vehicle.latitude, vehicle.longitude])
    );
    map.fitBounds(bounds.pad(0.25), { animate: false, maxZoom: 15 });
  }, [map, vehicles, filterKey]);

  return null;
}

type LiveMapProps = {
  language: UiLanguage;
  embedded?: boolean;
};

export function LiveMap({ language, embedded = false }: LiveMapProps) {
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function load() {
      const currentRequest = ++requestId;
      try {
        const response = await fetchActiveVehicles(filter || undefined);
        if (!active || currentRequest !== requestId) return;
        setSnapshot({ response, fetchedAt: Date.now() });
        setError(null);
        setLoading(false);
      } catch (requestError) {
        if (!active || currentRequest !== requestId) return;
        setError(requestError);
        setLoading(false);
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), 5_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [filter, reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  function changeFilter(value: string) {
    setSnapshot(null);
    setLoading(true);
    setFilter(value);
  }

  const staleSeconds = snapshot?.response.staleSeconds ?? 30;
  const allVehicles = snapshot?.response.vehicles ?? [];
  const vehicles: VehicleWithAge[] = snapshot
    ? allVehicles
        .map((vehicle) => ({
          ...vehicle,
          currentAge: estimateAgeSeconds(
            vehicle.ageSeconds,
            snapshot.fetchedAt,
            now
          ),
        }))
        .filter(
          (vehicle) =>
            classifyFreshness(vehicle.currentAge, staleSeconds) !== "stale"
        )
    : [];
  const newlyStale = allVehicles.length - vehicles.length;
  const hiddenCount = (snapshot?.response.staleHidden ?? 0) + newlyStale;
  const errorMessage = error ? describeApiError(error, language) : "";
  const lastSuccess = snapshot ? new Date(snapshot.fetchedAt) : null;
  const showLoadingOverlay = loading && !snapshot;
  const showErrorOverlay = Boolean(error) && !snapshot && !loading;
  const showEmptyOverlay =
    Boolean(snapshot) && !error && !loading && vehicles.length === 0;
  const offlineAndStale =
    Boolean(error) && Boolean(snapshot) && vehicles.length === 0;

  return (
    <section
      className={embedded ? "live-map-section live-map-embedded" : "live-map-section"}
      aria-labelledby={embedded ? undefined : "live-map-title"}
      aria-label={embedded ? t(language, "mapTitle") : undefined}
    >
      {!embedded ? (
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" aria-hidden="true" />
              {t(language, "mapSource")}
            </div>
            <h1 id="live-map-title">{t(language, "mapTitle")}</h1>
            <p>{t(language, "mapSubtitle")}</p>
          </div>
          <div className="live-counter" aria-live="polite">
            <span className="live-dot" aria-hidden="true" />
            {t(language, "mapLiveCount", { count: vehicles.length })}
          </div>
        </div>
      ) : null}

      {error ? (
        <Banner
          tone="warning"
          title={t(language, "mapErrorTitle")}
          action={
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={refresh}
            >
              {t(language, "commonRetry")}
            </button>
          }
        >
          <p>{errorMessage || t(language, "mapErrorBody")}</p>
          {lastSuccess ? (
            <p>
              {t(language, "mapOfflineNotice", {
                time: formatTime(lastSuccess.toISOString(), language),
              })}
            </p>
          ) : null}
        </Banner>
      ) : null}

      <div
        className={
          embedded ? "live-map-card live-map-card-embedded" : "card live-map-card"
        }
      >
        {!embedded ? (
          <div className="map-toolbar">
            <label htmlFor="map-route-filter">{t(language, "mapFilter")}</label>
            <select
              id="map-route-filter"
              value={filter}
              onChange={(event) => changeFilter(event.target.value)}
            >
              <option value="">{t(language, "mapAllRoutes")}</option>
              {tempuRoutes.map((route) => (
                <option key={route.number} value={route.number}>
                  {t(language, "routeNumberLabel", { number: route.number })} —{" "}
                  {route.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? t(language, "commonLoading") : t(language, "mapRefresh")}
            </button>
            {hiddenCount > 0 ? (
              <span className="stale-hint">
                {t(language, "mapStaleHidden", { count: hiddenCount })}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          className={embedded ? "map-frame map-frame-embedded" : "map-frame"}
          role="region"
          aria-label={t(language, "mapTitle")}
        >
          <MapContainer
            center={CHATTOGRAM_CENTER}
            zoom={13}
            scrollWheelZoom
            className="live-map-canvas"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FollowVehicles vehicles={vehicles} filterKey={filter} />
            {vehicles.map((vehicle) => (
              <Marker
                key={vehicle.publicId}
                position={[vehicle.latitude, vehicle.longitude]}
                icon={createVehicleIcon(vehicle.routeNumber)}
              >
                <Popup>
                  <strong>
                    {t(language, "routeNumberLabel", {
                      number: vehicle.routeNumber,
                    })}{" "}
                    — {vehicle.routeName}
                  </strong>
                  <br />
                  {vehicle.direction === "outbound"
                    ? t(language, "directionOutbound")
                    : t(language, "directionReturn")}
                  : {vehicle.startStop} → {vehicle.endStop}
                  <br />
                  {t(language, "mapLastUpdate")}:{" "}
                  {formatAge(vehicle.currentAge, language)}
                  <br />
                  {t(language, "mapSource")}
                  <br />
                  <em>{t(language, "mapNotVerified")}</em>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {showLoadingOverlay ? (
            <div className="map-overlay">
              <div className="map-overlay-card">
                <span className="map-overlay-icon" aria-hidden="true">
                  ◌
                </span>
                <strong>{t(language, "mapLoadingTitle")}</strong>
                <p>{t(language, "mapLoadingBody")}</p>
              </div>
            </div>
          ) : null}

          {showErrorOverlay ? (
            <div className="map-overlay">
              <div className="map-overlay-card">
                <span className="map-overlay-icon" aria-hidden="true">
                  ×
                </span>
                <strong>{t(language, "mapErrorTitle")}</strong>
                <p>{errorMessage || t(language, "mapErrorBody")}</p>
              </div>
            </div>
          ) : null}

          {showEmptyOverlay || offlineAndStale ? (
            <div className="map-overlay">
              <div className="map-overlay-card">
                <span className="map-overlay-icon" aria-hidden="true">
                  ◎
                </span>
                <strong>
                  {offlineAndStale
                    ? t(language, "mapErrorTitle")
                    : t(language, "mapEmptyTitle")}
                </strong>
                <p>
                  {offlineAndStale
                    ? t(language, "mapErrorBody")
                    : t(language, "mapEmptyBody")}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="map-footer">
          <p>{t(language, "mapPrivacy")}</p>
          <p>{t(language, "mapNotVerified")}</p>
          <span className="map-tile-note">{t(language, "mapTileNote")}</span>
        </div>
      </div>

      {!embedded ? (
        <section
          className="vehicle-list-section"
          aria-labelledby="vehicle-list-title"
        >
        <div className="results-heading">
          <h2 id="vehicle-list-title">{t(language, "mapVehicleList")}</h2>
          <span className="results-meta">
            {t(language, "mapListHint")}
          </span>
        </div>

        {vehicles.length === 0 ? (
          <p className="empty-list-text">
            {error
              ? t(language, "mapErrorBody")
              : t(language, "mapEmptyBody")}
          </p>
        ) : (
          <ul className="vehicle-list">
            {vehicles.map((vehicle) => (
              <li className="vehicle-item" key={vehicle.publicId}>
                <div className="vehicle-item-header">
                  <span className="route-badge">{vehicle.routeNumber}</span>
                  <div className="vehicle-title">
                    <strong>{vehicle.routeName}</strong>
                    <span>
                      {vehicle.direction === "outbound"
                        ? t(language, "directionOutbound")
                        : t(language, "directionReturn")}
                    </span>
                  </div>
                  <span className="vehicle-age">
                    {error ? `${t(language, "mapLastKnown")} · ` : ""}
                    {formatAge(vehicle.currentAge, language)}
                  </span>
                </div>
                <p className="vehicle-path">
                  {vehicle.startStop} → {vehicle.endStop}
                </p>
                <div className="vehicle-meta">
                  <span>
                    {t(language, "mapVehicleLabel", {
                      id: vehicle.publicId.slice(0, 6),
                    })}
                  </span>
                  {vehicle.accuracy !== null ? (
                    <span>
                      {t(language, "mapAccuracy")}:{" "}
                      {Math.round(vehicle.accuracy)} m
                    </span>
                  ) : null}
                  <span>{t(language, "mapSource")}</span>
                  <span>
                    {t(language, "mapLastUpdate")}:{" "}
                    {formatTime(vehicle.lastLocationAt, language)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        </section>
      ) : null}
    </section>
  );
}
