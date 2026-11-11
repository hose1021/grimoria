// @ts-check
import { state as storeState, dispatch, playerById } from "./store.js";
import { go, path } from "./router.js";
import { t } from "./strings.js";
import { roleById, imageFor } from "./roles.js";
import { esc } from "./ui.js";

/** @typedef {import("./types.js").Command} Command */
/** @typedef {{ id: number, index: number, from: HTMLElement, startX: number, startY: number, x: number, y: number, active: boolean, ghost: HTMLElement | null, target: number | null }} Drag */

/** @type {import("./types.js").GameState} */
const state = storeState;

/** @type {AbortController | null} */
let abort = null;

// The store fills in a command id when the caller omits it.
/** @type {(command: Omit<Command, "id">) => any} */
const send = /** @type {any} */ (dispatch);

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const signal = abort.signal;

  let order = state.order.filter((id) => playerById(id));
  if (!order.length) {
    root.innerHTML = `
      <div class="seat-empty">
        <p class="label">Seat order</p>
        <h1>No one is seated yet.</h1>
        <p>Build the bag first, then deal it to seats.</p>
        <a class="btn btn--accent" href="${path("bag")}">Build the bag</a>
      </div>`;
    return;
  }
  /** @type {number | null} */
  let selected = null;
  /** @type {string[][]} */
  let history = [];
  let suppressClick = false;
  /** @type {Drag | null} */
  let drag = null;

  /** @param {string} id @returns {string} */
  const nameOf = (id) => {
    const player = playerById(id);
    if (!player) return "";
    return player.name || "Игрок " + (order.indexOf(id) + 1);
  };

  root.innerHTML = `
    <header class="seat-top">
      <div class="seat-title">
        <b>Seat order</b>
        <small>${esc(state.script ? state.script.name : "")} · <span id="seat-total">${order.length}</span> players</small>
      </div>
      <div class="seat-actions">
        <a class="btn" href="${path("player")}">${t("player")}</a>
        <a class="btn" href="${path("secrets")}">${t("secrets")}</a>
        <button class="btn" type="button" data-act="undo" disabled>Undo</button>
        <button class="btn" type="button" data-act="shuffle">Shuffle</button>
        <button class="btn btn--accent" type="button" data-act="use">Use this order</button>
      </div>
    </header>
    <main class="seat-stage">
      <div class="seat-ring" id="seat-ring">
        <div class="seat-hub">
          <div class="seat-hub-count"><span id="seat-count">${order.length}</span> <span class="seat-hub-total">занято</span></div>
          <p class="seat-hub-note">Seat 1 is the start.<br>Numbers run clockwise.</p>
          <svg viewBox="0 0 60 60" width="40" height="40" aria-hidden="true">
            <path d="M44 30a14 14 0 1 1-4.1-9.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M40 13v8h-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <p class="seat-status" role="status">Нажмите место, затем другое, чтобы поменять.</p>
    </main>`;

  const ring = /** @type {HTMLElement} */ (root.querySelector("#seat-ring"));
  const hub = /** @type {HTMLElement} */ (root.querySelector(".seat-hub"));
  const statusEl = /** @type {HTMLElement} */ (root.querySelector(".seat-status"));
  const undoBtn = /** @type {HTMLButtonElement} */ (root.querySelector('[data-act="undo"]'));
  const countEl = /** @type {HTMLElement} */ (root.querySelector("#seat-count"));
  const totalEl = /** @type {HTMLElement} */ (root.querySelector("#seat-total"));

  /** @param {string} text */
  function announce(text) {
    statusEl.textContent = text;
  }

  function snapshot() {
    history.push(order.slice());
    undoBtn.disabled = false;
  }

  /** @param {string} id @param {number} index @returns {HTMLElement} */
  function makeSeat(id, index) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "seat-item";
    item.dataset.index = String(index);
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / order.length;
    const radius = order.length > 10 ? 42 : 40;
    item.style.setProperty("--x", (50 + radius * Math.cos(angle)).toFixed(2) + "%");
    item.style.setProperty("--y", (50 + radius * Math.sin(angle)).toFixed(2) + "%");
    const name = nameOf(id);
    item.setAttribute(
      "aria-label",
      `Seat ${index + 1}, ${name}. Activate, then activate another seat to swap.`,
    );
    item.setAttribute("aria-pressed", String(selected === index));
    if (selected === index) item.classList.add("is-selected");
    if (index === 0) item.classList.add("is-start");

    const role = roleById(playerById(id)?.roleId ?? "");
    const disc = document.createElement("span");
    disc.className = "seat-disc";
    disc.innerHTML =
      `<span class="seat-num">${index + 1}</span>` +
      (role
        ? `<img class="seat-role" src="${esc(imageFor(role))}" alt="">`
        : `<span class="seat-mono">${name.charAt(0).toUpperCase() || "?"}</span>`);
    const label = document.createElement("span");
    label.className = "seat-name";
    label.textContent = name;
    item.append(disc, label);
    return item;
  }

  function render() {
    ring.querySelectorAll(".seat-item").forEach((el) => el.remove());
    ring.classList.toggle("is-dense", order.length > 10);
    order.forEach((id, index) => ring.insertBefore(makeSeat(id, index), hub));
    countEl.textContent = String(order.length);
    totalEl.textContent = String(order.length);
    undoBtn.disabled = history.length === 0;
  }

  function clearSelected() {
    selected = null;
  }

  /** @param {number} from @param {number} to */
  function swap(from, to) {
    if (from === to) {
      clearSelected();
      render();
      return;
    }
    snapshot();
    const held = order[from];
    order[from] = order[to];
    order[to] = held;
    clearSelected();
    announce(`${nameOf(order[to])} now sits at seat ${to + 1}.`);
    render();
  }

  /** @param {number} index */
  function activate(index) {
    if (selected === null) {
      selected = index;
      announce(`Seat ${index + 1} picked. Activate another seat to swap.`);
      render();
      return;
    }
    if (selected === index) {
      clearSelected();
      announce("Selection cancelled.");
      render();
      return;
    }
    swap(selected, index);
  }

  /** @param {PointerEvent} event @returns {Drag | null} */
  function beginDrag(event) {
    if (!(event.target instanceof Element)) return null;
    const item = /** @type {HTMLElement | null} */ (event.target.closest(".seat-item"));
    if (!item) return null;
    if (event.pointerType === "mouse" && event.button !== 0) return null;
    return {
      id: event.pointerId,
      index: Number(item.dataset.index),
      from: item,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      ghost: null,
      target: null,
    };
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.active) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
      drag.active = true;
      const ghost = /** @type {HTMLElement} */ (drag.from.cloneNode(true));
      ghost.classList.add("seat-ghost");
      ghost.classList.remove("is-selected");
      ghost.style.width = drag.from.getBoundingClientRect().width + "px";
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.from.classList.add("is-dragging");
    }
    event.preventDefault();
    if (drag.ghost) {
      drag.ghost.style.left = drag.x + "px";
      drag.ghost.style.top = drag.y + "px";
    }
    const under = document.elementFromPoint(drag.x, drag.y);
    const seat = under && /** @type {HTMLElement | null} */ (under.closest(".seat-item"));
    const next = seat ? Number(seat.dataset.index) : null;
    if (next !== drag.target) {
      if (drag.target !== null) {
        const old = ring.querySelector(`.seat-item[data-index="${drag.target}"]`);
        if (old) old.classList.remove("is-target");
      }
      drag.target = next;
      if (seat) seat.classList.add("is-target");
    }
  }

  function cleanupDrag() {
    if (drag && drag.ghost) drag.ghost.remove();
    if (drag && drag.from) drag.from.classList.remove("is-dragging");
    drag = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  /** @param {PointerEvent} event */
  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const landed = drag;
    const wasActive = landed.active;
    const target = landed.target;
    cleanupDrag();
    if (!wasActive) return;
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (target !== null && target !== landed.index) swap(landed.index, target);
    else {
      clearSelected();
      render();
    }
  }

  function onPointerCancel() {
    cleanupDrag();
    clearSelected();
    render();
  }

  ring.addEventListener(
    "pointerdown",
    (event) => {
      drag = beginDrag(event);
      if (!drag) return;
      window.addEventListener("pointermove", onPointerMove, { passive: false, signal });
      window.addEventListener("pointerup", onPointerUp, { signal });
      window.addEventListener("pointercancel", onPointerCancel, { signal });
    },
    { signal },
  );

  ring.addEventListener(
    "click",
    (event) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (!(event.target instanceof Element)) return;
      const item = /** @type {HTMLElement | null} */ (event.target.closest(".seat-item"));
      if (item) activate(Number(item.dataset.index));
    },
    { signal },
  );

  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const btn = /** @type {HTMLElement | null} */ (event.target.closest("[data-act]"));
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "undo") {
        const last = history.pop();
        if (!last) return;
        order = last;
        clearSelected();
        announce("Undone.");
        render();
      } else if (act === "shuffle") {
        snapshot();
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const held = order[i];
          order[i] = order[j];
          order[j] = held;
        }
        clearSelected();
        announce("Seats shuffled.");
        render();
      } else if (act === "use") {
        const result = send({ type: "setOrder", payload: { order: order.slice() } });
        if (result.status !== "allowed") {
          window.alert(result.reason || "Не удалось изменить порядок мест.");
          return;
        }
        const dealt = order.some((id) => {
          const player = playerById(id);
          return player && player.roleId;
        });
        const needsSecrets = state.phase === "seat";
        go(dealt && needsSecrets ? "/secrets" : "/table");
      }
    },
    { signal },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && selected !== null) {
        clearSelected();
        announce("Selection cancelled.");
        render();
      }
    },
    { signal },
  );

  signal.addEventListener("abort", () => {
    if (drag && drag.ghost) drag.ghost.remove();
  });

  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
