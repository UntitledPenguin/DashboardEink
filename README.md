# Kindle Daily Dashboard

A minimal e-ink friendly dashboard for an unused Kindle or similar always-on display. It is built for Vercel: static frontend files plus one `/api/dashboard` serverless function.

## What It Shows

- Weather for your chosen location
- Month progress heatmap
- Today's tasks from a Dida365/TickTick calendar `.ics` feed
- Configurable exchange-rate pairs

## Deploy

1. Fork or clone this repo.
2. Push it to GitHub.
3. Import the repo into Vercel.
4. Add the environment variables you need in Vercel.
5. Redeploy after changing environment variables.

Open the deployed site on your Kindle. The page reloads once per hour.

## Vercel Environment Variables

Set these in `Project Settings -> Environment Variables`.

| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| `DIDA_ICS_URL` | No | `https://dida365.com/pub/calendar/feeds/.../basic.ics` | Use the HTTPS version of your Dida365 calendar feed. If omitted, the dashboard shows `没有task了 放松一下`. |
| `DASHBOARD_OWNER_NAME` | No | `Alex` | The page title becomes `Alex's Dashboard`. Defaults to `User`. |
| `WEATHER_LOCATION_LABEL` | No | `London` | Text shown in the weather heading. |
| `WEATHER_LATITUDE` | No | `51.5072` | Latitude for Open-Meteo. Defaults to London. |
| `WEATHER_LONGITUDE` | No | `-0.1276` | Longitude for Open-Meteo. Defaults to London. |
| `DASHBOARD_TIME_ZONE` | No | `Europe/London` | IANA timezone used for dates, tasks, and weather. |
| `EXCHANGE_PAIRS` | No | `GBP/CNY,GBP/USD,USD/CNY` | Comma-separated currency pairs supported by Frankfurter. |

## Customization Examples

Personal title:

```text
DASHBOARD_OWNER_NAME=Adam
```

Weather for Shanghai:

```text
WEATHER_LOCATION_LABEL=Shanghai
WEATHER_LATITUDE=31.2304
WEATHER_LONGITUDE=121.4737
DASHBOARD_TIME_ZONE=Asia/Shanghai
```

Different exchange pairs:

```text
EXCHANGE_PAIRS=USD/CNY,EUR/CNY,GBP/USD
```

## Dida365 Calendar Feed

In Dida365/TickTick, copy your calendar subscription URL. If it starts with `webcal://`, change it to `https://` before saving it in Vercel:

```text
webcal://dida365.com/pub/calendar/feeds/.../basic.ics
```

becomes:

```text
https://dida365.com/pub/calendar/feeds/.../basic.ics
```

Do not commit your real calendar feed URL to GitHub. Keep it in Vercel environment variables.

## Local Development

Opening `index.html` directly will show fallback placeholder data because `/api/dashboard` only exists on Vercel or a compatible local dev server.

To test the API locally, use Vercel's dev server:

```powershell
vercel dev
```

Then open the local URL Vercel prints.

## Notes

- The dashboard is optimized for a portrait `1080x1440` e-ink display.
- The frontend reloads every hour.
- The API response uses Vercel cache headers: `s-maxage=3600, stale-while-revalidate=600`.
