import { useMemo, useState, type FormEvent } from "react";
import { t, type UiLanguage } from "../i18n";
import { searchRoutes } from "../lib/search";
import { DirectionStops } from "./DirectionStops";
import { RouteDirectory } from "./RouteDirectory";
import { Banner } from "./Banner";
import { AssistantCard } from "./AssistantCard";
import { LiveMap } from "../LiveMap";

const popularStops = ["লালদীঘি", "জিইসি", "কোতোয়ালী মোড়", "বহদ্দারহাট"];

type PassengerHomeProps = {
  language: UiLanguage;
  aiConfigured: boolean | null;
  onOpenMap: () => void;
};

export function PassengerHome({
  language,
  aiConfigured,
  onOpenMap,
}: PassengerHomeProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [formError, setFormError] = useState(false);

  const results = useMemo(
    () => searchRoutes(submittedQuery),
    [submittedQuery]
  );

  function runSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setFormError(true);
      setSubmittedQuery("");
      return;
    }
    setFormError(false);
    setSubmittedQuery(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  return (
    <div className="passenger-home">
      <section className="hero" aria-labelledby="passenger-heading">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            {t(language, "searchEyebrow")}
          </div>
          <h1 id="passenger-heading">
            {t(language, "searchTitleLine1")}
            <br />
            <span>{t(language, "searchTitleLine2")}</span>
          </h1>
          <p className="hero-description">{t(language, "searchSubtitle")}</p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <span className="hero-ring hero-ring-one" />
          <span className="hero-ring hero-ring-two" />
          <span className="hero-pin">⌖</span>
          <span className="hero-sparkle">✳</span>
        </div>
      </section>

      <section className="card search-card" aria-labelledby="route-search-title">
        <div className="section-heading">
          <div className="heading-icon" aria-hidden="true">
            ↗
          </div>
          <div>
            <h2 id="route-search-title">{t(language, "searchHeading")}</h2>
            <p>{t(language, "searchHint")}</p>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSubmit} role="search">
          <label className="sr-only" htmlFor="route-search-input">
            {t(language, "searchHeading")}
          </label>
          <div className="search-input-wrap">
            <span className="input-location-icon" aria-hidden="true">
              ⌖
            </span>
            <input
              id="route-search-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setFormError(false);
              }}
              placeholder={t(language, "searchPlaceholder")}
              autoComplete="off"
            />
          </div>
          <button className="button button-primary" type="submit">
            {t(language, "searchButton")} <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="suggestion-row">
          <span className="suggestion-label">{t(language, "searchTry")}</span>
          {popularStops.map((stop) => (
            <button
              className="suggestion-chip"
              key={stop}
              type="button"
              onClick={() => {
                setQuery(stop);
                runSearch(stop);
              }}
            >
              {stop}
            </button>
          ))}
        </div>

        {formError ? (
          <div className="inline-notice inline-notice-warning" role="alert">
            {t(language, "searchRequired")}
          </div>
        ) : null}
      </section>

      {submittedQuery ? (
        <section
          className="search-results"
          aria-labelledby="search-results-title"
        >
          <div className="results-heading" aria-live="polite">
            <h2 id="search-results-title">
              {t(language, "searchResultCount", { count: results.length })}
            </h2>
            <span className="query-echo">“{submittedQuery}”</span>
          </div>

          {results.length === 0 ? (
            <Banner tone="warning" title={t(language, "searchNoResultTitle")}>
              {t(language, "searchNoResultBody")}
            </Banner>
          ) : (
            <div className="route-result-list">
              {results.map((result) => (
                <article className="card route-result" key={result.route.number}>
                  <header className="route-result-header">
                    <span className="route-badge route-badge-large">
                      {result.route.number}
                    </span>
                    <div>
                      <h3>{result.route.name}</h3>
                      {result.matchedRouteName || result.matchedRouteNumber ? (
                        <p className="route-match-note">
                          {t(language, "searchMatchRoute")}
                        </p>
                      ) : null}
                    </div>
                  </header>

                  {result.directions.map((direction) => (
                    <DirectionStops
                      key={direction.direction}
                      route={result.route}
                      direction={direction.direction}
                      matchedIndices={direction.matchedIndices}
                      language={language}
                    />
                  ))}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="content-grid">
        <section className="card map-card" aria-labelledby="explore-map-title">
          <div className="card-header">
            <div>
              <h2 id="explore-map-title">{t(language, "exploreMapTitle")}</h2>
              <p>{t(language, "exploreMapSubtitle")}</p>
            </div>
            <div className="map-card-actions">
              <span className="map-tag">
                <span className="tag-dot" aria-hidden="true" />
                {t(language, "exploreMapTag")}
              </span>
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={onOpenMap}
              >
                {t(language, "exploreMapOpen")}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <LiveMap language={language} embedded />
        </section>

        <div className="right-column">
          <AssistantCard language={language} aiConfigured={aiConfigured} />

          <section className="card info-card">
            <div className="info-icon" aria-hidden="true">
              ◎
            </div>
            <div>
              <h3>{t(language, "travelConfidenceTitle")}</h3>
              <p>{t(language, "travelConfidenceBody")}</p>
            </div>
          </section>
        </div>
      </div>

      <RouteDirectory language={language} />
    </div>
  );
}
