// Trouble Brewing domain: setup. No DOM or persistence.
import { bagErrors, isTbRole, roleTeam } from "../rules.js";
import { orderedPlayers, playerById, realTeamOf } from "../model.js";

import { addLog } from "./context.js";

export function setupErrors(state) {
  return bagErrors({
    count: state.setup.count,
    roles: state.setup.roles,
    bluffs: state.setup.bluffs,
    drunkShownId: state.setup.drunkShownId
  });
}


export function secretsErrors(state) {
  const errors = setupErrors(state);
  if (errors.length) return errors;
  if (state.phase === "setup") {
    errors.push({ code: "not-dealt", message: "Сначала раздайте роли." });
    return errors;
  }

  const players = orderedPlayers(state);
  // Setup secrets are needed only for the real role. A Drunk who was shown
  // this role wakes and receives false information; no real red herring is due.
  const has = (roleId) => players.some((player) => player.roleId === roleId);

  if (has("fortuneteller")) {
    const herring = state.setup.herringId ? playerById(state, state.setup.herringId) : null;
    if (!herring) {
      errors.push({ code: "herring", message: "Выберите красную селёдку Гадалки." });
    } else if (realTeamOf(herring) !== "good") {
      errors.push({ code: "herring-team", message: "Красная селёдка должна быть добрым игроком." });
    } else if (herring.roleId === "fortuneteller") {
      errors.push({ code: "herring-self", message: "Гадалка не может быть своей же ложной целью." });
    }
  }

  const infoChecks = [
    ["washerwoman", "townsfolk", "Прачка"],
    ["librarian", "outsider", "Библиотекарь"],
    ["investigator", "minion", "Сыщик"]
  ];
  for (const [roleId, team, label] of infoChecks) {
    if (!has(roleId)) continue;
    const info = state.setup.info[roleId];
    if (roleId === "librarian" && info && info.zero) {
      if (players.some((player) => roleTeam(player.roleId) === "outsider")) {
        errors.push({ code: "librarian-zero", message: "Библиотекарь не может узнать «ноль», если Изгои в игре есть." });
      }
      continue;
    }
    if (!info || !info.roleId || !Array.isArray(info.pair) || info.pair.length !== 2) {
      errors.push({ code: "info-" + roleId, message: label + ": выберите роль и двух игроков." });
      continue;
    }
    if (info.pair[0] === info.pair[1]) {
      errors.push({ code: "info-pair-" + roleId, message: label + ": нужны два разных игрока." });
    }
    if (!players.some((player) => player.id === info.pair[0]) || !players.some((player) => player.id === info.pair[1])) {
      errors.push({ code: "info-missing-" + roleId, message: label + ": один из игроков не найден." });
    }
    if (roleTeam(info.roleId) !== team) {
      errors.push({ code: "info-team-" + roleId, message: label + ": выбранная роль не того типа." });
    }
    if (!state.setup.roles.includes(info.roleId)) {
      errors.push({ code: "info-inplay-" + roleId, message: label + ": выбранная роль должна быть в игре." });
    }
    const infoTeam = roleTeam(info.roleId);
    const pairPlayers = info.pair.map((id) => playerById(state, id));
    const includesTrue = pairPlayers.some((player) => (
      player && (
        player.roleId === info.roleId
        || ((infoTeam === "townsfolk" || infoTeam === "outsider") && player.roleId === "spy")
        || (infoTeam === "minion" && player.roleId === "recluse")
      )
    ));
    if (!includesTrue) {
      errors.push({
        code: "info-true-" + roleId,
        message: label + ": хотя бы один из двух должен быть этой ролью или подходящей регистрацией."
      });
    }
  }

  const drunk = players.find((player) => player.roleId === "drunk");
  const mask = drunk && drunk.shownRoleId;
  const maskCheck = mask && infoChecks.find(([id]) => id === mask);
  if (maskCheck) {
    const info = state.setup.info[mask];
    const expectedTeam = maskCheck[1];
    const validPair = info && Array.isArray(info.pair) && info.pair.length === 2
      && info.pair[0] && info.pair[1] && info.pair[0] !== info.pair[1]
      && players.some((player) => player.id === info.pair[0])
      && players.some((player) => player.id === info.pair[1]);
    if (!info || !info.forDrunk || !info.roleId || !validPair) {
      errors.push({
        code: "drunk-info",
        message: "Пьяница: выберите ложную роль и двух игроков."
      });
    } else if (roleTeam(info.roleId) !== expectedTeam) {
      errors.push({
        code: "drunk-info-team",
        message: "Пьяница: ложная роль должна быть того же типа, что показанная роль."
      });
    }
  }
  return errors;
}


export function autoSecrets(state, options = {}) {
  const onlyMissing = options.onlyMissing === true;
  const players = orderedPlayers(state);
  const byTeam = (team) => players.filter((player) => roleTeam(player.roleId) === team);

  if (state.setup.roles.includes("fortuneteller") && (!onlyMissing || !state.setup.herringId)) {
    const good = players.filter((player) => realTeamOf(player) === "good" && player.roleId !== "fortuneteller");
    if (good.length) state.setup.herringId = good[0].id;
  }

  const pickPair = (truePlayer) => {
    const decoy = players.find((player) => player.id !== truePlayer.id);
    if (!decoy) return null;
    return {
      roleId: truePlayer.roleId,
      pair: [truePlayer.id, decoy.id],
      matchIndex: 0
    };
  };

  if (state.setup.roles.includes("washerwoman") && (!onlyMissing || !state.setup.info.washerwoman)) {
    const actor = players.find((player) => player.roleId === "washerwoman");
    const truePlayer = byTeam("townsfolk").find((player) => !actor || player.id !== actor.id)
      || byTeam("townsfolk")[0];
    if (truePlayer) state.setup.info.washerwoman = pickPair(truePlayer);
  }
  if (state.setup.roles.includes("librarian") && (!onlyMissing || !state.setup.info.librarian)) {
    const outsiders = byTeam("outsider");
    if (!outsiders.length) {
      state.setup.info.librarian = { zero: true, pair: [] };
    } else {
      state.setup.info.librarian = pickPair(outsiders[0]);
    }
  }
  if (state.setup.roles.includes("investigator") && (!onlyMissing || !state.setup.info.investigator)) {
    const minions = byTeam("minion");
    if (minions.length) state.setup.info.investigator = pickPair(minions[0]);
  }
  return state;
}


export function dealGame(state, options = {}) {
  const errors = setupErrors(state);
  if (errors.length) return { ok: false, errors };
  const roles = state.setup.roles.slice();
  const assignment = options.assignment || null;
  if (assignment) {
    for (const [id, roleId] of Object.entries(assignment)) {
      if (!state.players[id]) return { ok: false, error: "Место " + id + " не найдено." };
      if (!isTbRole(roleId)) return { ok: false, error: "Неизвестная роль: " + roleId };
    }
  }

  const shuffled = roles.slice();
  if (!assignment) {
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor((options.random || Math.random)() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
  }

  orderedPlayers(state).forEach((player, index) => {
    const roleId = assignment ? assignment[player.id] : shuffled[index];
    const shown = roleId === "drunk" ? state.setup.drunkShownId : roleId;
    player.roleId = roleId || null;
    player.shownRoleId = shown || null;
    player.team = roleId ? (roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good") : null;
    player.alive = true;
    player.claimed = false;
    player.reminders = [];
    player.used = {};
    player.voteToken = true;
    player.butlerMasterId = null;
    player.changedFrom = null;
    player.deadAt = null;
    player.notes = "";
  });

  state.bluffs = (state.setup.count >= 7 ? state.setup.bluffs : []).slice();
  state.herringId = null;
  state.setup.herringId = null;
  state.setup.info = { washerwoman: null, librarian: null, investigator: null };
  state.phase = "deal";
  state.night = { number: 1, queue: [], currentIndex: 0, demonChanged: false };
  state.day = {
    number: 1, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: false
  };
  state.deaths = [];
  state.executions = [];
  state.effects = [];
  state.winner = null;
  state.reviewOpen = false;
  state.publicRevealed = false;
  state.setup.ready = false;
  state.log = [];
  addLog(state, {
    kind: "setup",
    title: "Роли разданы",
    detail: "Передайте устройство по кругу. Не обсуждайте роли до конца первой ночи."
  });
  return { ok: true };
}


export function claimSeat(state, playerId, name) {
  const player = playerById(state, playerId);
  if (!player) return { ok: false, error: "Игрок не найден." };
  if (!player.roleId) return { ok: false, error: "Роль ещё не раздана." };
  if (player.claimed) return { ok: false, error: "Этот номер уже занят." };
  player.name = String(name || "").trim().slice(0, 24) || player.name;
  player.claimed = true;
  addLog(state, {
    secret: true,
    kind: "deal",
    title: "Место " + player.seat + " занято",
    detail: player.name,
    playerId: player.id
  });
  return { ok: true, player };
}

// ---------------------------------------------------------------------------
// Manual correction

