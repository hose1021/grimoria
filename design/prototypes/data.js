/* Shared demo game for the five view concepts. Same state in every prototype. */
window.GAME = {
  script: "Trouble Brewing",
  scriptId: "tb",
  players: 8,
  night: 3,
  day: 2,
  notes:
    "Poisoner hit the Empath on N2. Finn was executed on D2. One evil still hidden. Check Grace's Spy claim before N3.",
  bluffs: [
    { id: "soldier", role: "Soldier", img: "soldier_g.webp", team: "Townsfolk" },
    { id: "mayor", role: "Mayor", img: "mayor_g.webp", team: "Townsfolk" },
    { id: "saint", role: "Saint", img: "saint_g.webp", team: "Outsider" }
  ],
  seats: [
    {
      seat: 1, name: "Alice", role: "Empath", team: "Townsfolk",
      img: "empath_g.webp", alive: true, shroud: false,
      reminders: ["1 evil next door"],
      ability: "Each night, you learn how many of your two living neighbours are evil."
    },
    {
      seat: 2, name: "Ben", role: "Fortune Teller", team: "Townsfolk",
      img: "fortuneteller_g.webp", alive: true, shroud: false,
      reminders: ["Red herring: Grace"],
      ability: "Each night, choose 2 players: you learn if either is the Demon. One player is your red herring and registers as the Demon."
    },
    {
      seat: 3, name: "Carla", role: "Monk", team: "Townsfolk",
      img: "monk_g.webp", alive: true, shroud: false,
      reminders: ["Protected: Alice"],
      ability: "Each night, choose a player, other than yourself: they are safe from the Demon tonight."
    },
    {
      seat: 4, name: "Dan", role: "Undertaker", team: "Townsfolk",
      img: "undertaker_g.webp", alive: true, shroud: false,
      reminders: ["D2: Poisoner"],
      ability: "Each night, you learn which character was executed today."
    },
    {
      seat: 5, name: "Eve", role: "Drunk", team: "Outsider",
      img: "drunk_g.webp", alive: true, shroud: false,
      shownRole: "Butler", shownTeam: "Townsfolk", shownImg: "butler_g.webp",
      shownAbility: "Each night, choose a player: tomorrow you may only vote if they also vote.",
      reminders: ["Thinks: Butler"],
      ability: "You do not know you are the Drunk. You think you are a Townsfolk, but your ability is not working."
    },
    {
      seat: 6, name: "Finn", role: "Poisoner", team: "Minion",
      img: "poisoner_e.webp", alive: false, shroud: true,
      reminders: ["Executed D2"],
      ability: "Each night, choose a player: they are poisoned tonight and tomorrow."
    },
    {
      seat: 7, name: "Grace", role: "Spy", team: "Minion",
      img: "spy_e.webp", alive: true, shroud: false,
      reminders: ["Sees the grimoire"],
      ability: "Each night, you see the grimoire. You may register as good for abilities and wins."
    },
    {
      seat: 8, name: "Hugo", role: "Imp", team: "Demon",
      img: "imp_e.webp", alive: true, shroud: false,
      reminders: ["Bluff: Saint"],
      ability: "Each night, choose a player: they die. If you kill yourself, a Minion becomes the Imp."
    }
  ],
  nightOrder: [
    { role: "Poisoner", step: "Poison a player", done: true },
    { role: "Monk", step: "Protect a player", done: true },
    { role: "Spy", step: "Show the grimoire", done: false },
    { role: "Imp", step: "Choose a victim", done: false },
    { role: "Empath", step: "Give the count", done: false },
    { role: "Fortune Teller", step: "Show the red herring", done: false },
    { role: "Undertaker", step: "Show the executed role", done: false }
  ],
  log: [
    { phase: "Night 1", title: "Eve is poisoned", detail: "The Poisoner picks Eve on the first night.", player: "5", done: true },
    { phase: "Night 1", title: "Empath reads 1", detail: "Neighbours: Eve and Ben. Count given: 1.", player: "1", done: true },
    { phase: "Day 1", title: "No execution", detail: "Nomination tied, Mayor survived.", player: null, done: true },
    { phase: "Night 2", title: "Monk protects Alice", detail: "Alice is safe from the Demon.", player: "3", done: true },
    { phase: "Night 2", title: "Poisoner picks Alice", detail: "Empath is poisoned tonight and tomorrow.", player: "6", done: true },
    { phase: "Day 2", title: "Finn executed", detail: "The town executed the Poisoner. Undertaker learns Poisoner.", player: "6", done: true },
    { phase: "Night 3", title: "Spy checks the grimoire", detail: "Grace reviews the grimoire before the Demon picks.", player: "7", done: false }
  ]
};
