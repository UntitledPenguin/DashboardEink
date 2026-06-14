const fallbackData = {
  profile: {
    title: "Daily Dashboard",
    dateLabel: "Sunday, 14 June",
    refreshedAt: "13:01",
  },
  weather: {
    temperatureC: 19,
    summary: "Light rain, calm wind",
    hourly: [
      { time: "1 PM", condition: "cloud", temperatureC: 18 },
      { time: "2 PM", condition: "cloud", temperatureC: 19 },
      { time: "3 PM", condition: "rain", temperatureC: 20 },
      { time: "4 PM", condition: "rain", temperatureC: 20 },
    ],
  },
  exchangeRates: [
    { pair: "USD/CNY", value: "7.18" },
    { pair: "GBP/CNY", value: "9.69" },
    { pair: "GBP/USD", value: "1.35" },
  ],
  todos: [
    { title: "Review dashboard layout on Kindle browser", meta: "Design", done: false },
    { title: "Draft Dida 365 task adapter", meta: "Backend later", done: false },
    { title: "Check weather API location settings", meta: "Home", done: false },
    { title: "Decide refresh cadence", meta: "Device", done: true },
  ],
  monthProgress: {
    year: 2026,
    month: 6,
    monthLabel: "June 2026",
    today: 14,
    daysInMonth: 30,
  },
};

const icons = {
  cloud: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 42h29a10 10 0 0 0 0-20 16 16 0 0 0-30-5 12 12 0 0 0 1 25z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  rain: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 36h29a10 10 0 0 0 0-20 16 16 0 0 0-30-5 12 12 0 0 0 1 25z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26 45l-4 7M39 45l-4 7" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `,
};

function renderDashboard(data) {
  document.title = data.profile.title;
  document.getElementById("dashboard-date").textContent = data.profile.dateLabel;
  document.getElementById("refreshed-at").textContent = data.profile.refreshedAt;
  document.getElementById("current-temp").textContent = data.weather.temperatureC;
  document.getElementById("weather-summary").textContent = data.weather.summary;

  document.getElementById("forecast").innerHTML = data.weather.hourly
    .map((item) => `
      <article class="forecast-item">
        <div>${item.time}</div>
        <div class="mini-weather">${icons[item.condition] || icons.cloud}</div>
        <div>${formatForecastValue(item.temperatureC)}</div>
      </article>
    `)
    .join("");

  document.getElementById("exchange-rates").innerHTML = data.exchangeRates
    .map((rate) => `
      <article class="rate">
        <span class="rate-label">${rate.pair}</span>
        <span class="rate-value">${rate.value}</span>
      </article>
    `)
    .join("");

  document.getElementById("todo-list").innerHTML = data.todos
    .map((todo) => `
      <li class="todo-item${todo.done ? " is-done" : ""}">
        <span class="todo-check" aria-hidden="true"></span>
        <div>
          <p class="todo-title">${todo.title}</p>
          <p class="todo-meta">${todo.meta}</p>
        </div>
      </li>
    `)
    .join("");

  renderMonthHeatmap(data.monthProgress);
}

function getMondayFirstOffset(year, month) {
  const sundayFirstDay = new Date(year, month - 1, 1).getDay();
  return (sundayFirstDay + 6) % 7;
}

function renderMonthHeatmap(progress) {
  const offset = getMondayFirstOffset(progress.year, progress.month);
  const cells = [];

  for (let index = 0; index < offset; index += 1) {
    cells.push('<span class="day-cell is-empty" aria-hidden="true"></span>');
  }

  for (let day = 1; day <= progress.daysInMonth; day += 1) {
    const classes = [
      "day-cell",
      day <= progress.today ? "is-passed" : "",
      day === progress.today ? "is-today" : "",
    ].filter(Boolean).join(" ");
    const label = day <= progress.today ? `${day}, passed` : `${day}, upcoming`;
    cells.push(`<span class="${classes}" aria-label="${label}">${day}</span>`);
  }

  document.getElementById("month-label").textContent = progress.monthLabel;
  document.getElementById("month-progress-copy").textContent =
    `${progress.today} / ${progress.daysInMonth} days passed`;
  document.getElementById("month-heatmap").innerHTML = cells.join("");
}

function formatForecastValue(value) {
  return typeof value === "number" ? `${value}&deg;C` : value;
}

async function loadDashboard() {
  try {
    const response = await fetch(`/api/dashboard?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`Dashboard API failed: ${response.status}`);
    renderDashboard(await response.json());
  } catch (error) {
    renderDashboard(fallbackData);
  }
}

loadDashboard();
setInterval(() => {
  window.location.reload();
}, 60 * 60 * 1000);
