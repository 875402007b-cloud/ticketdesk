// ============================================================
// dashboard.js – Dashboard with statistics, upcoming shows, recent bookings
// ============================================================

import { getShows, getStudents, getBookings, getAvailableSeats } from "./api.js";
import { ICONS, formatDate, formatTime, loadingState, emptyState, toast, cache, escapeHtml, availabilityStatus } from "./utils.js";
import { navigate, refreshCache } from "./app.js";

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p>Overview of shows, students and bookings</p>
      </div>
    </div>
    <div id="stats-area">${loadingState("Loading statistics…")}</div>
    <div class="section-title">Upcoming Shows</div>
    <div id="upcoming-area">${loadingState("Loading shows…")}</div>
    <div class="section-title" style="margin-top:30px;">Recent Bookings</div>
    <div id="recent-area">${loadingState("Loading bookings…")}</div>
  `;

  try {
    await refreshCache();
    const [shows, students, bookings] = [cache.shows, cache.students, cache.bookings];

    const confirmed = bookings.filter((b) => (b.status || "").toUpperCase() === "CONFIRMED");
    const cancelled = bookings.filter((b) => (b.status || "").toUpperCase() === "CANCELLED");

    document.getElementById("stats-area").innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card__icon primary">${ICONS.film}</div>
          <div><div class="stat-card__value">${shows.length}</div><div class="stat-card__label">Total Shows</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon accent">${ICONS.students}</div>
          <div><div class="stat-card__value">${students.length}</div><div class="stat-card__label">Total Students</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon warning">${ICONS.ticket}</div>
          <div><div class="stat-card__value">${bookings.length}</div><div class="stat-card__label">Total Bookings</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon success">${ICONS.checkCircle}</div>
          <div><div class="stat-card__value">${confirmed.length}</div><div class="stat-card__label">Confirmed</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon danger">${ICONS.xCircle}</div>
          <div><div class="stat-card__value">${cancelled.length}</div><div class="stat-card__label">Cancelled</div></div>
        </div>
      </div>
    `;

    // Upcoming shows with availability
    const now = Date.now();
    const upcoming = shows
      .filter((s) => new Date(s.showTime).getTime() >= now || true) // show all if none in future
      .sort((a, b) => new Date(a.showTime) - new Date(b.showTime))
      .slice(0, 6);

    const upcomingEl = document.getElementById("upcoming-area");
    if (upcoming.length === 0) {
      upcomingEl.innerHTML = emptyState("No shows available.", "film");
    } else {
      upcomingEl.innerHTML = `<div class="shows-grid">${upcoming.map(showCardHtml).join("")}</div>`;
      await Promise.all(upcoming.map((s) => fillAvailability(s.id)));
    }

    // Recent bookings
    const recent = bookings.slice().reverse().slice(0, 8);
    const recentEl = document.getElementById("recent-area");
    if (recent.length === 0) {
      recentEl.innerHTML = emptyState("No bookings found.", "bookings");
    } else {
      recentEl.innerHTML = `
        <div class="table-wrap"><div class="table-scroll">
          <table>
            <thead><tr><th>Booking ID</th><th>Student</th><th>Show</th><th>Seats</th><th>Status</th></tr></thead>
            <tbody>
              ${recent.map((b) => `
                <tr style="cursor:pointer" data-booking="${b.id}">
                  <td>#${escapeHtml(b.id)}</td>
                  <td>${escapeHtml(studentName(b))}</td>
                  <td>${escapeHtml(showTitle(b))}</td>
                  <td>${escapeHtml(b.seats)}</td>
                  <td>${statusBadge(b.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div></div>
      `;
      recentEl.querySelectorAll("[data-booking]").forEach((row) => {
        row.addEventListener("click", () => navigate("booking", { id: row.dataset.booking }));
      });
    }
  } catch (err) {
    toast("Unable to load dashboard data", "error");
    document.getElementById("stats-area").innerHTML = emptyState("Unable to load dashboard data. Is the backend running?", "alert");
  }
}

function showCardHtml(show) {
  return `
    <div class="show-card" data-show="${show.id}">
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

async function fillAvailability(showId) {
  const el = document.querySelector(`[data-avail="${showId}"]`);
  if (!el) return;
  try {
    const avail = await getAvailableSeats(showId);
    const show = cache.shows.find((s) => s.id == showId);
    const total = show ? show.totalSeats : 0;
    const status = availabilityStatus(avail, total);
    el.innerHTML = `${avail} <span class="badge ${status.class}" style="margin-left:6px">${status.label}</span>`;
  } catch {
    el.textContent = "—";
  }
}

function studentName(booking) {
  if (booking.student && booking.student.name) return booking.student.name;
  const s = cache.students.find((st) => st.id == booking.studentId);
  return s ? s.name : `Student #${booking.studentId}`;
}

function showTitle(booking) {
  if (booking.show && booking.show.title) return booking.show.title;
  const s = cache.shows.find((sh) => sh.id == booking.showId);
  return s ? s.title : `Show #${booking.showId}`;
}

export function statusBadge(status) {
  const s = (status || "").toUpperCase();
  if (s === "CONFIRMED") return `<span class="badge badge-success">Confirmed</span>`;
  if (s === "CANCELLED") return `<span class="badge badge-danger">Cancelled</span>`;
  return `<span class="badge badge-muted">${escapeHtml(status || "Unknown")}</span>`;
}

// Wire up card buttons via event delegation handled in shows.js too, but for dashboard:
document.addEventListener("click", (e) => {
  const view = e.target.closest("[data-view]");
  const book = e.target.closest("[data-book]");
  if (view) navigate("show", { id: view.dataset.view });
  if (book) navigate("book", { id: book.dataset.book });
});
