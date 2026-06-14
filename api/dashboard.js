const DIDA_ICS_URL = process.env.DIDA_ICS_URL;

const FALLBACK_TODO = "没有task了 放松一下";
const LONDON_TIME_ZONE = "Europe/London";

module.exports = async function handler(req, res) {
  try {
    const [weather, exchangeRates, todos] = await Promise.all([
      fetchWeather(),
      fetchExchangeRates(),
      fetchTodayTodos(),
    ]);
    const now = new Date();

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    res.status(200).json({
      profile: {
        title: "Daily Dashboard",
        dateLabel: formatDateLabel(now),
        refreshedAt: formatTime(now),
      },
      weather,
      exchangeRates,
      todos,
      monthProgress: getMonthProgress(now),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to build dashboard data",
      message: error.message,
    });
  }
};

async function fetchWeather() {
  const response = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current=temperature_2m,apparent_temperature,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon"
  );
  if (!response.ok) throw new Error(`Open-Meteo failed: ${response.status}`);

  const data = await response.json();
  const todayMax = Math.round(data.daily.temperature_2m_max[0]);
  const todayMin = Math.round(data.daily.temperature_2m_min[0]);
  const rainChance = data.daily.precipitation_probability_max[0];
  const temperature = Math.round(data.current.temperature_2m);

  return {
    temperatureC: temperature,
    apparentC: Math.round(data.current.apparent_temperature),
    weatherCode: data.current.weather_code,
    summary: getWeatherSummary(data.current.weather_code),
    todayMaxC: todayMax,
    todayMinC: todayMin,
    precipitationProbability: rainChance,
    hourly: [
      { time: "Now", condition: getIconCondition(data.current.weather_code), temperatureC: temperature },
      { time: "Min", condition: "cloud", temperatureC: todayMin },
      { time: "Max", condition: "cloud", temperatureC: todayMax },
      { time: "Rain", condition: rainChance > 20 ? "rain" : "cloud", temperatureC: `${rainChance}%` },
    ],
  };
}

async function fetchExchangeRates() {
  const [gbpResponse, usdResponse] = await Promise.all([
    fetch("https://api.frankfurter.app/latest?base=GBP"),
    fetch("https://api.frankfurter.app/latest?base=USD"),
  ]);
  if (!gbpResponse.ok) throw new Error(`Frankfurter GBP failed: ${gbpResponse.status}`);
  if (!usdResponse.ok) throw new Error(`Frankfurter USD failed: ${usdResponse.status}`);

  const gbp = await gbpResponse.json();
  const usd = await usdResponse.json();

  return [
    { pair: "GBP/CNY", value: formatRate(gbp.rates.CNY) },
    { pair: "GBP/USD", value: formatRate(gbp.rates.USD) },
    { pair: "USD/CNY", value: formatRate(usd.rates.CNY) },
  ];
}

async function fetchTodayTodos() {
  if (!DIDA_ICS_URL) {
    return [{ title: FALLBACK_TODO, meta: "Dida 365", done: false }];
  }

  const response = await fetch(DIDA_ICS_URL.replace(/^webcal:\/\//, "https://"));
  if (!response.ok) throw new Error(`Dida ICS failed: ${response.status}`);

  const ics = await response.text();
  const todayKey = formatDateKey(new Date());
  const todos = parseIcsEvents(ics)
    .filter((event) => occursOnDate(event, todayKey))
    .map((event) => ({
      title: event.SUMMARY || FALLBACK_TODO,
      meta: formatTodoMeta(event),
      done: false,
    }));

  if (todos.length === 0) {
    return [{ title: FALLBACK_TODO, meta: "Dida 365", done: false }];
  }

  return todos.slice(0, 6);
}

function parseIcsEvents(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map((block) => {
    const event = {};
    block.split(/\r?\n/).forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return;
      const rawKey = line.slice(0, separatorIndex);
      const key = rawKey.split(";")[0];
      event[key] = decodeIcsText(line.slice(separatorIndex + 1));
      event[`${key}_RAW`] = rawKey;
    });
    return event;
  });
}

function occursOnDate(event, dateKey) {
  const startKey = getEventStartDateKey(event);
  if (startKey === dateKey) return true;
  if (!event.RRULE || !startKey || startKey > dateKey) return false;
  if (isExcludedDate(event, dateKey)) return false;
  return matchesRecurrence(event, startKey, dateKey);
}

function matchesRecurrence(event, startKey, dateKey) {
  const rule = parseRule(event.RRULE);
  const interval = Number(rule.INTERVAL || 1);

  if (rule.FREQ === "DAILY") {
    return daysBetween(startKey, dateKey) % interval === 0;
  }

  if (rule.FREQ === "WEEKLY") {
    const dayDelta = daysBetween(startKey, dateKey);
    const allowedDays = rule.BYDAY ? rule.BYDAY.split(",") : [weekdayCode(startKey)];
    return dayDelta >= 0 && Math.floor(dayDelta / 7) % interval === 0 && allowedDays.includes(weekdayCode(dateKey));
  }

  if (rule.FREQ === "MONTHLY") {
    const start = dateFromKey(startKey);
    const target = dateFromKey(dateKey);
    const monthDelta =
      (target.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      target.getUTCMonth() -
      start.getUTCMonth();
    const allowedDays = rule.BYMONTHDAY ? rule.BYMONTHDAY.split(",").map(Number) : [start.getUTCDate()];
    return monthDelta >= 0 && monthDelta % interval === 0 && allowedDays.includes(target.getUTCDate());
  }

  return false;
}

function getEventStartDateKey(event) {
  return event.DTSTART ? event.DTSTART.slice(0, 8) : "";
}

function isExcludedDate(event, dateKey) {
  return Boolean(event.EXDATE && event.EXDATE.split(",").some((date) => date.slice(0, 8) === dateKey));
}

function parseRule(rule) {
  return Object.fromEntries(rule.split(";").map((part) => part.split("=")));
}

function formatTodoMeta(event) {
  const start = event.DTSTART || "";
  if (event.DTSTART_RAW && event.DTSTART_RAW.includes("VALUE=DATE")) return "All day";
  if (start.length >= 13) return `${start.slice(9, 11)}:${start.slice(11, 13)}`;
  return "Dida 365";
}

function getMonthProgress(date) {
  const parts = getLondonParts(date);
  const year = Number(parts.year);
  const month = Number(parts.month);
  return {
    year,
    month,
    monthLabel: new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: LONDON_TIME_ZONE,
    }).format(date),
    today: Number(parts.day),
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: LONDON_TIME_ZONE,
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LONDON_TIME_ZONE,
  }).format(date);
}

function formatDateKey(date) {
  const parts = getLondonParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
}

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: LONDON_TIME_ZONE,
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function daysBetween(startKey, dateKey) {
  return Math.floor((dateFromKey(dateKey) - dateFromKey(startKey)) / 86400000);
}

function dateFromKey(dateKey) {
  return new Date(Date.UTC(Number(dateKey.slice(0, 4)), Number(dateKey.slice(4, 6)) - 1, Number(dateKey.slice(6, 8))));
}

function weekdayCode(dateKey) {
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][dateFromKey(dateKey).getUTCDay()];
}

function decodeIcsText(value) {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function formatRate(value) {
  return Number(value).toFixed(2);
}

function getIconCondition(code) {
  return [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) ? "rain" : "cloud";
}

function getWeatherSummary(code) {
  const summaries = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
  };
  return summaries[code] || "Cloudy";
}
