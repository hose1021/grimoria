/* One game state in localStorage. Roles resolve from the packaged PG data. */
(function () {
  var KEY = "pg.game.v1";
  var VERSION = 1;
  var NAMES = ["Alice", "Ben", "Carla", "Dan", "Eve", "Finn", "Grace", "Hugo", "Ivy", "Jack", "Kira", "Liam", "Mara", "Noah", "Olive"];
  var TEAM = {
    townsfolk: "Townsfolk",
    outsider: "Outsider",
    minion: "Minion",
    demon: "Demon",
    traveller: "Traveller",
    fabled: "Fabled",
    loric: "Loric"
  };

  function read() {
    try {
      var data = JSON.parse(window.localStorage.getItem(KEY));
      if (!data || data.v !== VERSION) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function write(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* private mode or full storage: the demo stays in memory */ }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function catalog() {
    return (window.PG && window.PG.roles) || [];
  }

  function roleById(id) {
    if (!id) return null;
    var roles = catalog();
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].id === id) return roles[i];
    }
    return null;
  }

  function teamName(team) {
    return TEAM[team] || team;
  }

  function imageFor(role) {
    var evil = role.team === "minion" || role.team === "demon";
    var img = role.image && (role.image[evil ? 1 : 0] || role.image[0]);
    if (!img) img = "/build/img/roles/" + role.id + (evil ? "_e" : "_g") + ".webp";
    return img.replace(/^\/build\//, "../../web/build/");
  }

  function imageName(role) {
    return imageFor(role).split("/").pop();
  }

  function defaultName(id) {
    var n = Number(id);
    return NAMES[n - 1] || "Player " + n;
  }

  function defaultPlayer(id) {
    return {
      id: String(id),
      seat: Number(id),
      name: defaultName(id),
      alive: true,
      shroud: false,
      reminders: [],
      claimed: false,
      role: "Unknown",
      team: "",
      ability: "",
      img: ""
    };
  }

  function applyRole(p, roleId, shownId) {
    var role = roleById(roleId);
    if (!role) return;
    p.roleId = role.id;
    p.role = role.name;
    p.team = teamName(role.team);
    p.ability = role.ability;
    p.img = imageName(role);

    var shown = (shownId && shownId !== roleId) ? roleById(shownId) : role;
    if (!shown) shown = role;
    p.shownRoleId = shown.id;
    p.shownRole = shown.name;
    p.shownTeam = teamName(shown.team);
    p.shownAbility = shown.ability;
    p.shownImg = imageName(shown);
  }

  function resolveBluff(id) {
    var role = roleById(id);
    if (!role) return null;
    return {
      id: role.id,
      role: role.name,
      team: teamName(role.team),
      img: imageName(role)
    };
  }

  function hydrate(rawGame) {
    var state = clone(rawGame);
    var saved = read() || {};
    var rawById = {};

    state.seats.forEach(function (p) {
      p.id = p.id || String(p.seat);
      rawById[p.id] = p;
    });

    var ids = (saved.order && saved.order.length)
      ? saved.order.slice()
      : state.seats.map(function (p) { return p.id; });

    var seats = ids.map(function (id, i) {
      var base = rawById[id] ? clone(rawById[id]) : defaultPlayer(id);
      base.id = id;
      base.seat = i + 1;
      base.claimed = !!base.claimed;

      var s = saved.players && saved.players[id];
      if (s) {
        if (typeof s.name === "string") base.name = s.name;
        if (typeof s.alive === "boolean") base.alive = s.alive;
        if (typeof s.shroud === "boolean") base.shroud = s.shroud;
        if (Array.isArray(s.reminders)) base.reminders = s.reminders.slice();
        base.claimed = !!s.claimed;
        if (s.roleId) applyRole(base, s.roleId, s.shownRoleId);
      }
      return base;
    });

    if (seats.length) state.seats = seats;

    if (saved.bluffs && saved.bluffs.length) {
      var bluffs = saved.bluffs.map(resolveBluff).filter(Boolean);
      if (bluffs.length) state.bluffs = bluffs;
    }

    if (typeof saved.notes === "string") state.notes = saved.notes;
    if (Array.isArray(saved.nightOrder)) state.nightOrder = clone(saved.nightOrder);
    if (Array.isArray(saved.log)) state.log = clone(saved.log);
    if (typeof saved.night === "number") state.night = saved.night;
    if (typeof saved.scriptId === "string") state.scriptId = saved.scriptId;

    return state;
  }

  function snapshot(state) {
    var players = {};
    state.seats.forEach(function (p) {
      players[p.id] = {
        name: p.name,
        alive: !!p.alive,
        shroud: !!p.shroud,
        reminders: (p.reminders || []).slice(),
        claimed: !!p.claimed,
        roleId: p.roleId || null,
        shownRoleId: p.shownRoleId || null
      };
    });
    return {
      v: VERSION,
      updatedAt: new Date().toISOString(),
      scriptId: state.scriptId || "tb",
      order: state.seats.map(function (p) { return p.id; }),
      players: players,
      bluffs: (state.bluffs || []).map(function (b) { return b.id || null; }).filter(Boolean),
      notes: state.notes || "",
      night: state.night,
      nightOrder: (state.nightOrder || []).map(function (w) {
        return { role: w.role, step: w.step, done: !!w.done };
      }),
      log: state.log || []
    };
  }

  window.PGStore = {
    KEY: KEY,
    hydrate: hydrate,
    save: function (state) {
      write(snapshot(state));
    },
    savePlayer: function (id, patch) {
      var saved = read() || { v: VERSION };
      saved.players = saved.players || {};
      saved.players[id] = Object.assign({}, saved.players[id] || {}, patch);
      saved.updatedAt = new Date().toISOString();
      write(saved);
    },
    setOrder: function (ids) {
      var saved = read() || { v: VERSION };
      saved.order = ids.slice();
      saved.updatedAt = new Date().toISOString();
      write(saved);
    },
    order: function () {
      var saved = read();
      return saved && saved.order ? saved.order : null;
    },
    reset: function () {
      try {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem("pg.demo.v1");
      } catch (e) { /* ignore */ }
    },
    defaultName: defaultName,
    roleById: roleById,
    imageFor: imageFor,
    teamName: teamName
  };
})();
