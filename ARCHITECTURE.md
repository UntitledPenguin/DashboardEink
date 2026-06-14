# Kindle Daily Dashboard Architecture

The frontend is static and reads normalized data from `/api/dashboard`. The Vercel API gathers weather, exchange rates, and Dida365 calendar items, then returns one dashboard payload.

## Frontend

- `index.html`: semantic shell for weather, exchange rates, Dida365 tasks, and month progress.
- `styles.css`: portrait e-ink layout for a `1080x1440` viewport, with pure white background, monochrome colors, Apple-style CJK text, and mono dashboard labels.
- `app.js`: fetches `/api/dashboard` when hosted on Vercel and falls back to placeholder data if the API is unavailable.
- `README.md`: setup and customization guide for people forking the repo.

## Backend

- `api/dashboard.js`: Vercel serverless API that fetches weather, exchange rates, and Dida365 calendar tasks.
- Weather adapter: fetches current temperature and daily summary for `WEATHER_LATITUDE`, `WEATHER_LONGITUDE`, and `DASHBOARD_TIME_ZONE`.
- Exchange adapter: fetches the comma-separated `EXCHANGE_PAIRS`, defaulting to `GBP/CNY,GBP/USD,USD/CNY`.
- Dida365 adapter: reads today's items from the `DIDA_ICS_URL` calendar feed and normalizes them to `{ title, meta, done }`. If no items are found, it returns `没有task了 放松一下`.
- Month progress adapter: computes the current year, month, day of month, month label, and number of days in the month.

## Dashboard Payload

`GET /api/dashboard` returns:

```json
{
  "profile": {
    "title": "User's Dashboard",
    "dateLabel": "Sunday 14 June",
    "refreshedAt": "13:01"
  },
  "weather": {
    "locationLabel": "London",
    "temperatureC": 19,
    "summary": "Partly cloudy",
    "hourly": [
      { "time": "Now", "condition": "cloud", "temperatureC": 19 }
    ]
  },
  "exchangeRates": [
    { "pair": "GBP/CNY", "value": "9.06" },
    { "pair": "GBP/USD", "value": "1.34" },
    { "pair": "USD/CNY", "value": "6.76" }
  ],
  "todos": [
    { "title": "洗衣服", "meta": "22:00", "done": false }
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

## Customization

Runtime customization is done with Vercel environment variables:

- `DASHBOARD_OWNER_NAME`
- `WEATHER_LOCATION_LABEL`
- `WEATHER_LATITUDE`
- `WEATHER_LONGITUDE`
- `DASHBOARD_TIME_ZONE`
- `EXCHANGE_PAIRS`
- `DIDA_ICS_URL`

See `README.md` for examples.

## Kindle Notes

- Target portrait Kindle rendering at `1080x1440`.
- Keep the page monochrome, pure white, and animation-free.
- The frontend reloads once per hour.
- The API response uses `s-maxage=3600, stale-while-revalidate=600`.
- The calendar heatmap currently shows days passed in the month, not task completion status.
