const LANGS: string[] = ["en", "ru", "az"];

type Dict = Record<string, string>;
const DICT: Record<string, Dict> = {
  ru: {
    "The bag": "Мешок",
    "Trouble Brewing · choose the roles, then deal": "Trouble Brewing · выберите роли и раздайте",
    "Auto-fill": "Автозаполнение",
    Clear: "Очистить",
    "Deal the bag": "Раздать мешок",
    "Confirm new game": "Подтвердить новую игру",
    "New game": "Новая игра",
    players: "игроков",
    "Demon bluffs": "Блефы Демона",
    "Choose bluffs": "Выбрать блефы",
    "Choose three tokens": "Выберите три жетона",
    "Three tokens not in play. Townsfolk by convention.": "Три жетона вне игры. Обычно горожане.",
    Done: "Готово",
    Empty: "Пусто",
    "Drunk is shown": "Пьянице показан",
    "A Townsfolk not in play.": "Горожанин вне игры.",
    "First night": "Первая ночь",
    "Sorted by the role's wake number. Roles that do not wake are left out.":
      "Сортировка по номеру пробуждения. Роли без пробуждения не показаны.",
    "Dealing assigns the selected roles to seats 1 to N, resets claims, deaths and reminders, clears notes and starts Night 1. Seat order can be changed after.":
      "Раздача назначает роли местам с 1 по N, сбрасывает отметки, смерти и напоминания, очищает заметки и начинает Ночь 1. Порядок мест можно изменить позже.",
    "The bag is legal. Deal when ready.": "Мешок корректен. Можно раздавать.",
    "Not ready.": "Не готово.",
    "choose exactly one Demon": "выберите ровно одного Демона",
    "choose three bluffs": "выберите три блефа",
    "choose the Drunk's shown Townsfolk": "выберите горожанина для Пьяницы",
    "No first-night wakes.": "Нет пробуждений в первую ночь.",
    "No Townsfolk left": "Горожане закончились",
    "No unused roles.": "Нет свободных ролей.",
    Townsfolk: "Горожане",
    Outsider: "Изгои",
    Minion: "Приспешники",
    Demon: "Демоны",
    "Seat order": "Порядок мест",
    Undo: "Отменить",
    Shuffle: "Перемешать",
    "Use this order": "Использовать порядок",
    "Seat 1 is the start.": "Место 1 — начало.",
    "Numbers run clockwise.": "Номера идут по часовой стрелке.",
    "Tap a seat, then another to swap. Drag one seat onto another. Escape cancels.":
      "Нажмите место, затем другое для обмена. Перетащите место на место. Escape отменяет.",
    "Storyteller device": "Устройство рассказчика",
    "Back to table": "К столу",
    "Pass the device": "Передайте устройство",
    "Pick your number": "Выберите свой номер",
    "Tap a number. Only then does your role appear.":
      "Нажмите номер. Только тогда появится ваша роль.",
    "All numbers are taken.": "Все номера заняты.",
    "No role has been dealt yet. Set up the bag, then hand the device to the players.":
      "Роли ещё не розданы. Соберите мешок и передайте устройство игрокам.",
    "Cover the screen": "Закройте экран",
    "Make sure nobody else can see. Your role appears on the next screen.":
      "Убедитесь, что никто не видит. Роль появится на следующем экране.",
    "Reveal my role": "Показать мою роль",
    "Pick another number": "Выбрать другой номер",
    "Only you can see this card.": "Эту карту видите только вы.",
    "Your name": "Ваше имя",
    "Type your name": "Введите имя",
    "Save and hide": "Сохранить и скрыть",
    "Cancel and hide": "Отмена и скрыть",
    "No roles assigned": "Роли не назначены",
    "Build a bag and deal the seats before you open the grimoire.":
      "Соберите мешок и раздайте роли, прежде чем открыть гримуар.",
    "Deal roles": "Раздать роли",
    Bag: "Мешок",
    Seats: "Места",
    "Hand to player": "Игроку",
    Night: "Ночь",
    "Hide screen": "Скрыть экран",
    SEATS: "МЕСТА",
    Role: "Роль",
    Reminders: "Напоминания",
    Notes: "Заметки",
    Log: "Журнал",
    "No reminders": "Нет напоминаний",
    "Mark dead": "Отметить мёртвым",
    Revive: "Вернуть",
    Shroud: "Саван",
    "Remove shroud": "Снять саван",
    "Add reminder": "Добавить напоминание",
    "New reminder": "Новое напоминание",
    Add: "Добавить",
    "Storyteller notes": "Заметки рассказчика",
    "Private to this device.": "Только для этого устройства.",
    Close: "Закрыть",
    "Next night": "Следующая ночь",
    "Screen hidden": "Экран скрыт",
    "Grimoire hidden": "Гримуар скрыт",
    "Hand the device back before revealing anything.":
      "Верните устройство, прежде чем что-то показывать.",
    "Show grimoire": "Показать гримуар",
    "No roles wake tonight.": "Сегодня никто не просыпается.",
    "No seats.": "Нет мест.",
    "No role": "Нет роли",
    Unassigned: "Без роли",
    Dead: "Мёртв",
    Unshroud: "Снять саван",
    Reminder: "Напоминание",
    Language: "Язык",
    "This screen failed to load.": "Этот экран не загрузился.",
    "Go to the table": "К столу",
    "Game starts": "Игра начинается",
    "The bag is dealt. Night order is ready.": "Мешок роздан. Ночной порядок готов.",
    "Wake each role in order.": "Будите роли по порядку.",
  },
  az: {
    "The bag": "Çanta",
    "Trouble Brewing · choose the roles, then deal": "Trouble Brewing · rolları seçin və paylayın",
    "Auto-fill": "Avtomatik doldur",
    Clear: "Təmizlə",
    "Deal the bag": "Çantanı payla",
    "Confirm new game": "Yeni oyunu təsdiqlə",
    "New game": "Yeni oyun",
    players: "oyunçu",
    "Demon bluffs": "Demon blöfləri",
    "Choose bluffs": "Blöfləri seç",
    "Choose three tokens": "Üç token seçin",
    "Three tokens not in play. Townsfolk by convention.":
      "Oyunda olmayan üç token. Adətən şəhər sakinləri.",
    Done: "Hazır",
    Empty: "Boş",
    "Drunk is shown": "Sərxoşa göstərilir",
    "A Townsfolk not in play.": "Oyunda olmayan şəhər sakini.",
    "First night": "İlk gecə",
    "Sorted by the role's wake number. Roles that do not wake are left out.":
      "Oyanma nömrəsinə görə sıralanır. Oyandırmayan rollar göstərilmir.",
    "Dealing assigns the selected roles to seats 1 to N, resets claims, deaths and reminders, clears notes and starts Night 1. Seat order can be changed after.":
      "Paylama seçilmiş rolları 1–N yerlərə təyin edir, işarələri, ölümləri və xatırlatmaları sıfırlayır, qeydləri təmizləyir və 1-ci gecəni başladır. Yer sırası sonra dəyişdirilə bilər.",
    "The bag is legal. Deal when ready.": "Çanta qanunidir. Hazır olduqda paylayın.",
    "Not ready.": "Hazır deyil.",
    "choose exactly one Demon": "bir Demon seçin",
    "choose three bluffs": "üç blöf seçin",
    "choose the Drunk's shown Townsfolk": "Sərxoş üçün şəhər sakini seçin",
    "No first-night wakes.": "İlk gecədə oyanan yoxdur.",
    "No Townsfolk left": "Şəhər sakini qalmadı",
    "No unused roles.": "Boş rol yoxdur.",
    Townsfolk: "Şəhər sakinləri",
    Outsider: "Kənardakılar",
    Minion: "Minionlar",
    Demon: "Demonlar",
    "Seat order": "Yer sırası",
    Undo: "Geri qaytar",
    Shuffle: "Qarışdır",
    "Use this order": "Bu sıradan istifadə et",
    "Seat 1 is the start.": "1-ci yer başlanğıcdır.",
    "Numbers run clockwise.": "Nömrələr saat əqrəbi istiqamətindədir.",
    "Tap a seat, then another to swap. Drag one seat onto another. Escape cancels.":
      "Yerə, sonra digər yerə toxunun. Yeri yerə sürükləyin. Escape ləğv edir.",
    "Storyteller device": "Hekayəçi cihazı",
    "Back to table": "Masaya qayıt",
    "Pass the device": "Cihazı ötür",
    "Pick your number": "Nömrənizi seçin",
    "Tap a number. Only then does your role appear.":
      "Nömrəyə toxunun. Rolunuz yalnız bundan sonra görünəcək.",
    "All numbers are taken.": "Bütün nömrələr tutulub.",
    "No role has been dealt yet. Set up the bag, then hand the device to the players.":
      "Rollar hələ paylanmayıb. Çantanı qurun və cihazı oyunçulara verin.",
    "Cover the screen": "Ekranı örtün",
    "Make sure nobody else can see. Your role appears on the next screen.":
      "Heç kimin görmədiyinə əmin olun. Rolunuz növbəti ekranda görünəcək.",
    "Reveal my role": "Rolumu göstər",
    "Pick another number": "Başqa nömrə seç",
    "Only you can see this card.": "Bu kartı yalnız siz görürsünüz.",
    "Your name": "Adınız",
    "Type your name": "Adınızı yazın",
    "Save and hide": "Yadda saxla və gizlət",
    "Cancel and hide": "Ləğv et və gizlət",
    "No roles assigned": "Rollar təyin edilməyib",
    "Build a bag and deal the seats before you open the grimoire.":
      "Qrimuarı açmadan əvvəl çantanı qurun və rolları paylayın.",
    "Deal roles": "Rolları payla",
    Bag: "Çanta",
    Seats: "Yerlər",
    "Hand to player": "Oyunçuya ver",
    Night: "Gecə",
    "Hide screen": "Ekranı gizlət",
    SEATS: "YERLƏR",
    Role: "Rol",
    Reminders: "Xatırlatmalar",
    Notes: "Qeydlər",
    Log: "Jurnal",
    "No reminders": "Xatırlatma yoxdur",
    "Mark dead": "Ölü işarələ",
    Revive: "Dirilt",
    Shroud: "Kəfən",
    "Remove shroud": "Kəfəni götür",
    "Add reminder": "Xatırlatma əlavə et",
    "New reminder": "Yeni xatırlatma",
    Add: "Əlavə et",
    "Storyteller notes": "Hekayəçi qeydləri",
    "Private to this device.": "Yalnız bu cihaz üçün.",
    Close: "Bağla",
    "Next night": "Növbəti gecə",
    "Screen hidden": "Ekran gizlədilib",
    "Grimoire hidden": "Qrimuar gizlədilib",
    "Hand the device back before revealing anything.": "Nəsə göstərməzdən əvvəl cihazı qaytarın.",
    "Show grimoire": "Qrimuarı göstər",
    "No roles wake tonight.": "Bu gecə heç kim oyanmır.",
    "No seats.": "Yer yoxdur.",
    "No role": "Rol yoxdur",
    Unassigned: "Təyin edilməyib",
    Dead: "Ölü",
    Unshroud: "Kəfəni götür",
    Reminder: "Xatırlatma",
    Language: "Dil",
    "This screen failed to load.": "Bu ekran yüklənmədi.",
    "Go to the table": "Masaya keç",
    "Game starts": "Oyun başlayır",
    "The bag is dealt. Night order is ready.": "Çanta paylandı. Gecə sırası hazırdır.",
    "Wake each role in order.": "Rolları sıra ilə oyandırın.",
  },
};

const PATTERNS: Record<string, Array<[RegExp, string]>> = {
  ru: [
    [/^Night (\d+) · (\d+) alive$/, "Ночь $1 · $2 живых"],
    [/^Night (\d+)$/, "Ночь $1"],
    [/^Seat (\d+) of (\d+)$/, "Место $1 из $2"],
    [/^Seat (\d+)$/, "Место $1"],
    [/^(\d+) of (\d+) wakes resolved$/, "$1 из $2 пробуждений"],
    [/^(\d+) of (\d+) numbers still open$/, "Свободно $1 из $2 номеров"],
    [/^(\d+) total$/, "Всего $1"],
    [/^(\d+) seated$/, "$1 занято"],
    [/^Number (\d+)$/, "Номер $1"],
    [/^Number (\d+), open$/, "Номер $1, свободен"],
    [/^Hides in (\d+)s$/, "Скроется через $1 с"],
    [/^Trouble Brewing · (\d+) players$/, "Trouble Brewing · $1 игроков"],
    [/^Night (\d+) begins$/, "Начинается ночь $1"],
    [/^(.+) died$/, "$1: смерть"],
    [/^(.+) executed$/, "$1 казнён"],
  ],
  az: [
    [/^Night (\d+) · (\d+) alive$/, "Gecə $1 · $2 sağ"],
    [/^Night (\d+)$/, "Gecə $1"],
    [/^Seat (\d+) of (\d+)$/, "Yer $1 / $2"],
    [/^Seat (\d+)$/, "Yer $1"],
    [/^(\d+) of (\d+) wakes resolved$/, "$1 / $2 oyanma tamamlandı"],
    [/^(\d+) of (\d+) numbers still open$/, "$1 / $2 nömrə boşdur"],
    [/^(\d+) total$/, "Cəmi $1"],
    [/^(\d+) seated$/, "$1 oturub"],
    [/^Number (\d+)$/, "Nömrə $1"],
    [/^Number (\d+), open$/, "Nömrə $1, boş"],
    [/^Hides in (\d+)s$/, "$1 san sonra gizlənəcək"],
    [/^Trouble Brewing · (\d+) players$/, "Trouble Brewing · $1 oyunçu"],
    [/^Night (\d+) begins$/, "Gecə $1 başlayır"],
    [/^(.+) died$/, "$1 öldü"],
    [/^(.+) executed$/, "$1 edam edildi"],
  ],
};

const TEAM_RE = /^(Townsfolk|Outsiders|Minions|Demon) (\d+) of (\d+)$/;
const AZ_TEAM: Record<string, string> = {
  Townsfolk: "Şəhər sakinləri",
  Outsiders: "Kənardakılar",
  Minions: "Minionlar",
  Demon: "Demonlar",
};
const RU_TEAM: Record<string, string> = {
  Townsfolk: "Горожане",
  Outsiders: "Изгои",
  Minions: "Приспешники",
  Demon: "Демоны",
};

let lang = "en";

export function setLang(code: string): void {
  lang = LANGS.includes(code) ? code : "en";
  try {
    localStorage.setItem("pg.lang", lang);
  } catch {
    /* ignore */
  }
}

export function getLang(): string {
  return lang;
}

function notReady(text: string): string {
  const prefix = lang === "ru" ? "Не готово: " : "Hazır deyil: ";
  const body = text.slice("Not ready: ".length).replace(/\.$/, "");
  const parts = body.split(", ").map((part) => {
    const team = part.match(TEAM_RE);
    if (team) {
      const names = lang === "ru" ? RU_TEAM : AZ_TEAM;
      return `${names[team[1]!] ?? team[1]} ${team[2]} / ${team[3]}`;
    }
    return translate(part);
  });
  return prefix + parts.join(", ") + ".";
}

function translate(text: string): string {
  if (lang === "en" || !text) return text;
  if (text.startsWith("Not ready: ")) return notReady(text);
  const dict = DICT[lang] || {};
  if (dict[text]) return dict[text];
  for (const [re, replacement] of PATTERNS[lang] || []) {
    if (re.test(text)) return text.replace(re, replacement);
  }
  return text;
}

function translateTextNode(node: Node): void {
  const raw = node.nodeValue || "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const next = translate(trimmed);
  if (next !== trimmed) {
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = lead + next + trail;
  }
}

function translateAttributes(root: Element): void {
  root.querySelectorAll("[placeholder], [aria-label], [title]").forEach((node) => {
    for (const attr of ["placeholder", "aria-label", "title"]) {
      const value = node.getAttribute(attr);
      if (!value) continue;
      const next = translate(value);
      if (next !== value) node.setAttribute(attr, next);
    }
  });
}

export function translateText(text: string): string {
  return translate(text);
}

export function apply(root: Element): void {
  if (lang === "en") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  /** @type {Node[]} */
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent) return;
    if (parent.closest(".lang-switch, script, style")) return;
    translateTextNode(node);
  });
  translateAttributes(root);
}

function ensureSwitch(root: Element, onChange: (code: string) => void): void {
  root.querySelectorAll("header").forEach((header) => {
    const existing = header.querySelector<HTMLSelectElement>(".lang-switch");
    if (existing) {
      if (existing.value !== lang) existing.value = lang;
      return;
    }
    const select = document.createElement("select");
    select.className = "lang-switch";
    select.setAttribute("aria-label", "Language");
    select.innerHTML =
      '<option value="en">EN</option><option value="ru">RU</option><option value="az">AZ</option>';
    select.value = lang;
    select.addEventListener("change", () => onChange(select.value));
    header.append(select);
  });
}

export function watch(root: Element, onChange: (code: string) => void): () => void {
  const run = () => {
    ensureSwitch(root, onChange);
    apply(root);
  };
  const observer = new MutationObserver(() => window.requestAnimationFrame(run));
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  run();
  return () => observer.disconnect();
}
