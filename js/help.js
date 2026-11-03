import { TB, imageFor } from "./roles.js";
import {
  NIGHT_FIRST, NIGHT_OTHER, SYSTEM_STEPS, roleLabel, teamLabel
} from "./rules.js";
import { t } from "./strings.js";

let abort = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function roleName(id) {
  const role = TB.find((candidate) => candidate.id === id);
  return role ? role.name : (SYSTEM_STEPS[id] || roleLabel(id));
}

const WALKTHROUGH = [
  {
    step: "Подготовка",
    host: "Выберите число игроков и тайно соберите легальный мешок.",
    app: "Настройка: состав, случайный набор или учебный набор 7/10/12.",
    publicLine: "Объявите сценарий и число игроков. Не называйте роли.",
    check: "Один Демон, точные количества, блефы, маска Пьяницы."
  },
  {
    step: "Раздача",
    host: "Передайте устройство по кругу. Игрок открывает только показанную роль.",
    app: "Игроку: номер → закрытый экран → роль → имя.",
    publicLine: "«Не обсуждайте роли до конца первой ночи».",
    check: "Все номера заняты или имена введены; Пьяница не видит настоящую роль."
  },
  {
    step: "Рассадка",
    host: "Сверьте порядок мест с физическим кругом.",
    app: "Места: обмен и перемешивание, затем «Секреты».",
    publicLine: "«Место 1 — здесь, дальше по часовой стрелке».",
    check: "Соседи совпадают с реальным столом."
  },
  {
    step: "Секреты",
    host: "Выберите красную селёдку и пары «один из двух».",
    app: "Секреты: красная селёдка, пары, напоминания.",
    publicLine: "Молча.",
    check: "Прачка, Библиотекарь, Сыщик и Гадалка настроены."
  },
  {
    step: "Первая ночь",
    host: "Разбудите роли по очереди. Знакомство зла — отдельные шаги.",
    app: "Ночь: очередь, цели, карточки, «Шаг выполнен».",
    publicLine: "Только жесты и карточки. Не называйте роли.",
    check: "Информация выдана, напоминания стоят, смерти отмечены."
  },
  {
    step: "Утро",
    host: "Объявите только публичные смерти.",
    app: "День: утреннее объявление.",
    publicLine: "«Этой ночью погибли…». Без причин и ролей.",
    check: "Никто не узнал причину смерти."
  },
  {
    step: "Номинации",
    host: "Откройте номинации. Живой номинирует одного раза; цель — один раз.",
    app: "День: ведущий вводит только итог казни. Голоса считаются за столом.",
    publicLine: "«Votes for … starting now»; поднимайте руки по кругу.",
    check: "Порог: строго больше половины живых; мёртвые не увеличивают порог."
  },
  {
    step: "Казнь",
    host: "Казните единоличного лидера или закончите день без казни.",
    app: "День: выберите казнённого или «без казни»; смерть и казнь — разные события.",
    publicLine: "«Игрок казнён» — без роли.",
    check: "Максимум одна казнь; Святой и Мэр проверены."
  },
  {
    step: "Победа",
    host: "Сначала разрешите наследование Демона, затем проверяйте победу.",
    app: "Итог: победитель, причина, разбор по кнопке.",
    publicLine: "Не раскрывайте роли до команды ведущего.",
    check: "Нет живого Демона → добро; двое живых → зло; Святой/Мэр."
  }
];

export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  const first = NIGHT_FIRST.map((id, index) => {
    if (id === "scarletwoman") return "";
    return `<li><span>${index + 1}</span><b>${esc(roleName(id))}</b></li>`;
  }).join("");
  const other = NIGHT_OTHER.map((id, index) => {
    if (id === "scarletwoman") return "";
    return `<li><span>${index + 1}</span><b>${esc(roleName(id))}</b></li>`;
  }).join("");

  const roles = TB.map((role) => `
    <details class="help-role">
      <summary>
        ${role.image ? `<img src="${esc(imageFor(role))}" alt="">` : ""}
        <b>${esc(role.name)}</b>
        <span>${esc(teamLabel(role.team))}</span>
      </summary>
      <p>${esc(role.ability)}</p>
    </details>`).join("");

  root.innerHTML = `<div class="help">
    <header class="help-head">
      <div>
        <p class="label">${esc(t("help"))}</p>
        <h1>Trouble Brewing · ${esc(t("rulesShort"))}</h1>
        <p>${esc(t("publicHint"))}</p>
      </div>
      <nav class="help-nav">
        <a class="btn" href="#/table">${esc(t("table"))}</a>
        <a class="btn" href="#/bag">${esc(t("setup"))}</a>
        <a class="btn" href="#/sheet">${esc(t("roleSheet"))}</a>
      </nav>
    </header>

    <main class="help-shell">
      <section class="help-section">
        <h2>${esc(t("stepHelp"))}</h2>
        <div class="help-walk">
          ${WALKTHROUGH.map((row) => `<article class="help-walk-row">
            <h3>${esc(row.step)}</h3>
            <dl>
              <dt>${esc(t("hostAction"))}</dt><dd>${esc(row.host)}</dd>
              <dt>${esc(t("app")) || "Приложение"}</dt><dd>${esc(row.app)}</dd>
              <dt>${esc(t("publicLine"))}</dt><dd>${esc(row.publicLine)}</dd>
              <dt>${esc(t("check"))}</dt><dd>${esc(row.check)}</dd>
            </dl>
          </article>`).join("")}
        </div>
      </section>

      <section class="help-section">
        <h2>${esc(t("firstNightList"))}</h2>
        <ol class="help-order">${first}</ol>
        <p class="help-note">Порядок по официальному nightsheet.json. Для 5–6 игроков шаги знакомства зла отсутствуют; способности ролей при этом работают.</p>
      </section>

      <section class="help-section">
        <h2>${esc(t("otherNightList"))}</h2>
        <ol class="help-order">${other}</ol>
        <p class="help-note">Смотритель Воронов просыпается только если погиб этой ночью. Гробовщик — только если сегодня была казнь со смертью. Алая женщина — пассивно, в момент смерти Демона.</p>
      </section>

      <section class="help-section">
        <h2>${esc(t("dayHelp"))}</h2>
        <ul class="help-list">
          <li>Утром объявляйте только имена погибших. Причину и роль не называйте.</li>
          <li>Обсуждение публичное и приватное. Таймер необязателен.</li>
          <li>Номинировать может только живой, один раз за день. Игрока можно номинировать один раз за день.</li>
          <li>Можно номинировать себя и мёртвого.</li>
          <li>Голосование ведёт ведущий на своём устройстве. Приложение фиксирует только итог казни, без поимённого протокола.</li>
          <li>Максимум одна казнь за день. Можно закончить день без казни.</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>${esc(t("votingHelp"))}</h2>
        <ul class="help-list">
          <li>Порог: строго больше половины живых, то есть floor(живых / 2) + 1. Голоса мёртвых входят в счёт, но не увеличивают порог.</li>
          <li>Живые голосуют сколько угодно раз. Мёртвый — один раз за игру.</li>
          <li>Голос мёртвого расходуется при учёте, даже если номинация не прошла.</li>
          <li>Казнят единоличного лидера с голосами не ниже порога. Ничья на максимуме — казни нет.</li>
          <li>Ничья ниже максимума не снимает лидера.</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>${esc(t("winHelp"))}</h2>
        <ul class="help-list">
          <li>Добро: нет живого Демона после наследования Алой женщины или Приспешника.</li>
          <li>Зло: в живых двое.</li>
          <li>Святой: казнь действующего Святого — поражение добра.</li>
          <li>Мэр: ровно три живых в конце дня и казни не было — победа добра.</li>
          <li>Если казнь была, но никто не умер, победа Мэра не срабатывает.</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>${esc(t("roleList"))}</h2>
        <div class="help-roles">${roles}</div>
      </section>
    </main>
  </div>`;
}
