# Kindle Daily Dashboard Architecture

This first draft is intentionally static. The UI reads from `dashboardData` in `app.js`, and each data group mirrors a future backend adapter.

## Frontend

- `index.html`: semantic shell for weather, exchange rates, Dida 365 tasks, and month progress.
- `styles.css`: Kindle/e-ink friendly portrait layout for a `1080x1440` viewport, with a pure white background, monochrome colors, strong text, and a mobile fallback.
- `app.js`: fetches `/api/dashboard` when hosted on Vercel and falls back to placeholder data if the API is unavailable.
- `api/dashboard.js`: Vercel serverless API that fetches weather, exchange rates, and Dida 365 calendar tasks.

## Future Backend Shape

Recommended response from `GET /api/dashboard`:

```json
{
  "profile": {
    "title": "Daily Dashboard",
    "dateLabel": "Sunday, 14 June",
    "refreshedAt": "13:01"
  },
  "weather": {
    "temperatureC": 19,
    "summary": "Light rain, calm wind",
    "hourly": [
      { "time": "1 PM", "condition": "cloud", "temperatureC": 18 }
    ]
  },
  "exchangeRates": [
    { "pair": "USD/CNY", "value": "7.18" },
    { "pair": "GBP/CNY", "value": "9.69" },
    { "pair": "GBP/USD", "value": "1.35" }
  ],
  "todos": [
    { "title": "Review dashboard layout", "meta": "Design", "done": false }
  ],
  "monthProgress": {
    "year": 2026,
    "month": 6,
    "monthLabel": "June 2026",
    "today": 14,
    "daysInMonth": 30
  }
}
```

## Backend Adapters To Add Later

- Weather adapter: fetch current temperature and a short hourly forecast for the configured home location.
- Exchange adapter: fetch USD, CNY, and GBP rates once per day and derive the three visible pairs.
- Dida 365 adapter: read today's items from the `DIDA_ICS_URL` calendar feed and normalize them to `{ title, meta, done }`. If no items are found, return `没有task了 放松一下`.
- Month progress adapter: compute the current year, month, day of month, month label, and number of days in the month.

## Kindle Notes

- Target portrait Kindle rendering at `1080x1440`.
- Keep the page monochrome, pure white, and animation-free.
- Use a long refresh interval, for example every 15-60 minutes, to reduce e-ink redraws.
- The calendar heatmap currently shows days passed in the month, not task completion status.
- The static prototype can be opened directly from `index.html`; the backend version should be served from a tiny local web server or hosted endpoint.
