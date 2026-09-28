// ============================================================
// shows.js – Shows page, show details, manage shows (admin)
// ============================================================

import {
  getShows, getShow, createShow, updateShow, deleteShow, getAvailableSeats,
} from "./api.js";
import {
  ICONS, formatDate, formatTime, formatDateTime, toBackendDateTime, fromBackendDateTime,
  loadingState, emptyState, toast, openModal, closeModal, confirmDialog,
  escapeHtml, availabilityStatus, cache,
} from "./utils.js";
import { navigate, refreshCache } from "./app.js";
import { statusBadge } from "./dashboard.js";

// ============================================================
// SHOWS PAGE
// ============================================================

let showsState = { search: "", dateFilter: "", shows: [], availCache: {} };

export async function renderShows(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Shows</h2>
        <p>Browse available movies and shows</p>
      </div>
    </div>
    <div class="toolbar">
      <div class="search">
        ${ICONS.search}
        <input type="text" id="show-search" placeholder="Search by title…" />
      </div>
      <input type="date" id="show-date-filter" />
      <button class="btn btn-ghost btn-sm" id="show-clear">Clear</button>
    </div>
    <div id="shows-area">${loadingState("Loading shows…")}</div>
  `;

  document.getElementById("show-search").addEventListener("input", (e) => {
    showsState.search = e.target.value.toLowerCase();
    renderShowCards();
  });
  document.getElementById("show-date-filter").addEventListener("change", (e) => {
    showsState.dateFilter = e.target.value;
    renderShowCards();
  });
  document.getElementById("show-clear").addEventListener("click", () => {
    showsState.search = "";
    showsState.dateFilter = "";
    document.getElementById("show-search").value = "";
    document.getElementById("show-date-filter").value = "";
    renderShowCards();
  });

  const area = document.getElementById("shows-area");
  area.innerHTML = loadingState("Loading shows…");
  try {
    const shows = await getShows();
    showsState.shows = Array.isArray(shows) ? shows : [];
    cache.shows = showsState.shows;
    await renderShowCards();
  } catch (err) {
    toast("Unable to load shows", "error");
    area.innerHTML = emptyState("Unable to load shows. Please check the backend is running.", "alert");
  }
}

async function renderShowCards() {
  const area = document.getElementById("shows-area");
  if (!area) return;

  let filtered = showsState.shows;
  if (showsState.search) {
    filtered = filtered.filter((s) => s.title.toLowerCase().includes(showsState.search));
  }
  if (showsState.dateFilter) {
    filtered = filtered.filter((s) => {
      const d = new Date(s.showTime);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === showsState.dateFilter;
    });
  }

  if (filtered.length === 0) {
    area.innerHTML = emptyState("No shows available.", "film");
    return;
  }

  area.innerHTML = `<div class="shows-grid">${filtered.map(showCardHtml).join("")}</div>`;

  // Wire buttons
  area.querySelectorAll("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => navigate("show", { id: btn.dataset.view }))
  );
  area.querySelectorAll("[data-book]").forEach((btn) =>
    btn.addEventListener("click", () => navigate("book", { id: btn.dataset.book }))
  );

  // Fill availability
  await Promise.all(filtered.map((s) => fillAvail(s.id)));
}

async function fillAvail(showId) {
  const el = document.querySelector(`[data-avail="${showId}"]`);
  if (!el) return;
  try {
    const avail = await getAvailableSeats(showId);
    const show = showsState.shows.find((s) => s.id == showId);
    const total = show ? show.totalSeats : 0;
    const status = availabilityStatus(avail, total);
    showsState.availCache[showId] = avail;
    el.innerHTML = `${avail} <span class="badge ${status.class}" style="margin-left:6px">${status.label}</span>`;
  } catch {
    el.textContent = "—";
  }
}

function showCardHtml(show) {
  return `
    <div class="show-card">
      <div class="show-card__banner">${ICONS.film}</div>
      <div class="show-card__body">
        <div class="show-card__title">${escapeHtml(show.title)}</div>
        <div class="show-card__meta">
          <div>${ICONS.calendar}<span>${formatDate(show.showTime)}</span></div>
          <div>${ICONS.clock}<span>${formatTime(show.showTime)}</span></div>
          <div>${ICONS.seat}<span>Total: ${show.totalSeats} seats</span></div>
        </div>
        <div class="show-card__seats">
          <span>Available</span>
          <strong data-avail="${show.id}">—</strong>
        </div>
        <div class="show-card__actions">
          <button class="btn btn-ghost btn-sm" data-view="${show.id}">View Details</button>
          <button class="btn btn-accent btn-sm" data-book="${show.id}">Book Now</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// SHOW DETAILS
// ============================================================

export async function renderShowDetails(container, id) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" id="back-btn">${ICONS.arrowLeft} Back</button>
      </div>
    </div>
    <div id="detail-area">${loadingState("Loading show details…")}</div>
  `;
  document.getElementById("back-btn").addEventListener("click", () => navigate("shows"));

  const area = document.getElementById("detail-area");
  if (!id) {
    area.innerHTML = emptyState("No show selected.", "alert");
    return;
  }

  try {
    const show = await getShow(id);
    let avail = null;
    try { avail = await getAvailableSeats(id); } catch { avail = "—"; }
    const status = availabilityStatus(typeof avail === "number" ? avail : 0, show.totalSeats);

    area.innerHTML = `
      <div class="card">
        <div class="detail-banner">${ICONS.film}</div>
        <h2 style="margin-bottom:6px;color:var(--card-text)">${escapeHtml(show.title)}</h2>
        <div style="margin-bottom:20px"><span class="badge ${status.class}">${status.label}</span></div>
        <div class="detail-grid">
          <div class="detail-item"><label>Date</label><span>${formatDate(show.showTime)}</span></div>
          <div class="detail-item"><label>Time</label><span>${formatTime(show.showTime)}</span></div>
          <div class="detail-item"><label>Total Seats</label><span>${show.totalSeats}</span></div>
          <div class="detail-item"><label>Available Seats</label><span>${avail}</span></div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-accent" id="book-btn" ${avail <= 0 ? "disabled" : ""}>${ICONS.ticket} Book Now</button>
          <button class="btn btn-ghost" id="shows-btn">All Shows</button>
        </div>
      </div>
    `;
    document.getElementById("book-btn").addEventListener("click", () => navigate("book", { id }));
    document.getElementById("shows-btn").addEventListener("click", () => navigate("shows"));
  } catch (err) {
    toast(err.message || "Unable to load show details", "error");
    area.innerHTML = emptyState("Unable to load show details.", "alert");
  }
}

// ============================================================
// MANAGE SHOWS
// ============================================================

let manageState = { shows: [] };

export async function renderManageShows(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Manage Shows</h2>
        <p>Create, edit and delete shows</p>
      </div>
      <button class="btn btn-accent" id="create-show-btn">${ICONS.plus} Create Show</button>
    </div>
    <div id="manage-area">${loadingState("Loading shows…")}</div>
  `;

  document.getElementById("create-show-btn").addEventListener("click", () => openShowForm());

  await loadManageShows();
}

async function loadManageShows() {
  const area = document.getElementById("manage-area");
  area.innerHTML = loadingState("Loading shows…");
  try {
    const shows = await getShows();
    manageState.shows = Array.isArray(shows) ? shows : [];
    cache.shows = manageState.shows;
    await renderManageTable();
  } catch (err) {
    toast("Unable to load shows", "error");
    area.innerHTML = emptyState("Unable to load shows.", "alert");
  }
}

async function renderManageTable() {
  const area = document.getElementById("manage-area");
  if (manageState.shows.length === 0) {
    area.innerHTML = emptyState("No shows available. Create one to get started.", "film");
    return;
  }

  // Fetch availability for all
  const availMap = {};
  await Promise.all(
    manageState.shows.map(async (s) => {
      try { availMap[s.id] = await getAvailableSeats(s.id); } catch { availMap[s.id] = "—"; }
    })
  );

  area.innerHTML = `
    <div class="table-wrap"><div class="table-scroll">
      <table>
        <thead>
          <tr><th>ID</th><th>Title</th><th>Date</th><th>Time</th><th>Total Seats</th><th>Available</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${manageState.shows.map((s) => `
            <tr>
              <td>#${s.id}</td>
              <td>${escapeHtml(s.title)}</td>
              <td>${formatDate(s.showTime)}</td>
              <td>${formatTime(s.showTime)}</td>
              <td>${s.totalSeats}</td>
              <td>${availMap[s.id] !== undefined ? availMap[s.id] : "—"}</td>
              <td class="table-actions">
                <button class="btn-icon" data-view="${s.id}" title="View">${ICONS.eye}</button>
                <button class="btn-icon" data-edit="${s.id}" title="Edit">${ICONS.edit}</button>
                <button class="btn-icon danger" data-delete="${s.id}" title="Delete">${ICONS.trash}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div></div>
  `;

  area.querySelectorAll("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => navigate("show", { id: btn.dataset.view }))
  );
  area.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openShowForm(parseInt(btn.dataset.edit, 10)))
  );
  area.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteShowConfirm(parseInt(btn.dataset.delete, 10)))
  );
}

function openShowForm(editId = null) {
  const isEdit = editId !== null;
  const existing = isEdit ? manageState.shows.find((s) => s.id === editId) : null;
  const dt = isEdit ? fromBackendDateTime(existing.showTime) : { date: "", time: "18:30" };

  openModal({
    title: isEdit ? "Edit Show" : "Create Show",
    body: `
      <form id="show-form">
        <div class="form-group">
          <label for="show-title">Title</label>
          <input class="form-control" id="show-title" value="${isEdit ? escapeHtml(existing.title) : ""}" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="show-date">Show Date</label>
            <input class="form-control" type="date" id="show-date" value="${dt.date}" required />
          </div>
          <div class="form-group">
            <label for="show-time">Show Time</label>
            <input class="form-control" type="time" id="show-time" value="${dt.time}" required />
          </div>
        </div>
        <div class="form-group">
          <label for="show-seats">Total Seats</label>
          <input class="form-control" type="number" id="show-seats" min="1" value="${isEdit ? existing.totalSeats : 100}" required />
          <div class="form-hint">Must be at least 1.</div>
        </div>
        <div class="form-error" id="show-form-error"></div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" id="show-cancel">Cancel</button>
      <button class="btn btn-primary" id="show-submit">${isEdit ? "Update" : "Create"} Show</button>
    `,
  });

  document.getElementById("show-cancel").addEventListener("click", closeModal);
  document.getElementById("show-submit").addEventListener("click", () => submitShowForm(editId));
}

async function submitShowForm(editId) {
  const title = document.getElementById("show-title").value.trim();
  const date = document.getElementById("show-date").value;
  const time = document.getElementById("show-time").value;
  const seats = parseInt(document.getElementById("show-seats").value, 10);
  const errEl = document.getElementById("show-form-error");
  errEl.textContent = "";

  if (!title) { errEl.textContent = "Title is required."; return; }
  if (!date) { errEl.textContent = "Date is required."; return; }
  if (!time) { errEl.textContent = "Time is required."; return; }
  if (!seats || seats < 1) { errEl.textContent = "Total seats must be at least 1."; return; }

  const showTime = toBackendDateTime(date, time);
  const payload = { title, showTime, totalSeats: seats };
  const btn = document.getElementById("show-submit");
  btn.disabled = true;
  btn.textContent = editId ? "Updating…" : "Creating…";

  try {
    if (editId) {
      await updateShow(editId, payload);
      toast("Show updated successfully", "success");
    } else {
      await createShow(payload);
      toast("Show created successfully", "success");
    }
    closeModal();
    await refreshCache();
    await loadManageShows();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = editId ? "Update" : "Create";
    errEl.textContent = err.message || "Unable to save show.";
  }
}

async function deleteShowConfirm(id) {
  const show = manageState.shows.find((s) => s.id === id);
  const confirmed = await confirmDialog({
    title: "Delete Show",
    message: `Are you sure you want to delete "${show ? show.title : `Show #${id}`}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Keep",
    danger: true,
  });
  if (!confirmed) return;

  try {
    await deleteShow(id);
    toast("Show deleted successfully", "success");
    await refreshCache();
    await loadManageShows();
  } catch (err) {
    toast(err.message || "Unable to delete show", "error");
  }
}
