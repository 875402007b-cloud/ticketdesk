// ============================================================
// bookings.js – Book Ticket, My Bookings, Booking Details, Cancel
// ============================================================

import {
  getBookings, getBooking, createBooking, cancelBooking,
  getShows, getStudents, getAvailableSeats,
} from "./api.js";
import {
  ICONS, formatDate, formatTime, loadingState, emptyState, toast,
  openModal, closeModal, confirmDialog, escapeHtml, availabilityStatus, cache,
} from "./utils.js";
import { navigate, refreshCache } from "./app.js";
import { statusBadge } from "./dashboard.js";

// ============================================================
// BOOK TICKET PAGE
// ============================================================

let bookState = { shows: [], students: [], selectedShow: null, avail: null };

export async function renderBookTicket(container, preselectShowId = null) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Book Ticket</h2>
        <p>Select a student and show to book tickets</p>
      </div>
    </div>
    <div id="book-area">${loadingState("Loading booking form…")}</div>
  `;

  try {
    const [shows, students] = await Promise.all([getShows(), getStudents()]);
    bookState.shows = Array.isArray(shows) ? shows : [];
    bookState.students = Array.isArray(students) ? students : [];
    cache.shows = bookState.shows;
    cache.students = bookState.students;

    const area = document.getElementById("book-area");
    if (bookState.shows.length === 0 || bookState.students.length === 0) {
      area.innerHTML = `
        <div class="card">
          ${bookState.students.length === 0 ? "<p style='margin:0 0 10px;color:var(--card-muted)'>No students registered yet. Please add a student first.</p>" : ""}
          ${bookState.shows.length === 0 ? "<p style='margin:0;color:var(--card-muted)'>No shows available yet. Please create a show first.</p>" : ""}
        </div>
      `;
      return;
    }

    area.innerHTML = `
      <div class="card" style="max-width:560px">
        <form id="booking-form">
          <div class="form-group">
            <label for="booking-student">Student</label>
            <select class="form-control" id="booking-student" required>
              <option value="">Select a student…</option>
              ${bookState.students.map((s) => `
                <option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.email)}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group">
            <label for="booking-show">Show</label>
            <select class="form-control" id="booking-show" required>
              <option value="">Select a show…</option>
              ${bookState.shows.map((s) => `
                <option value="${s.id}">${escapeHtml(s.title)} — ${formatDate(s.showTime)} ${formatTime(s.showTime)}</option>
              `).join("")}
            </select>
            <div id="avail-display" style="margin-top:10px;"></div>
          </div>
          <div class="form-group">
            <label for="booking-seats">Number of Seats</label>
            <input class="form-control" type="number" id="booking-seats" min="1" value="1" required />
            <div class="form-hint" id="seats-hint">Select a show to see available seats.</div>
          </div>
          <div class="form-error" id="booking-form-error"></div>
          <button class="btn btn-accent" id="booking-submit" type="button">${ICONS.ticket} Book Now</button>
        </form>
      </div>
    `;

    document.getElementById("booking-show").addEventListener("change", (e) => onShowChange(e.target.value));
    document.getElementById("booking-submit").addEventListener("click", submitBooking);

    if (preselectShowId) {
      const sel = document.getElementById("booking-show");
      sel.value = String(preselectShowId);
      onShowChange(preselectShowId);
    }
  } catch (err) {
    toast("Unable to load booking data", "error");
    document.getElementById("book-area").innerHTML = emptyState("Unable to load booking data.", "alert");
  }
}

async function onShowChange(showId) {
  const availEl = document.getElementById("avail-display");
  const seatsInput = document.getElementById("booking-seats");
  const hint = document.getElementById("seats-hint");
  if (!showId) {
    bookState.selectedShow = null;
    bookState.avail = null;
    availEl.innerHTML = "";
    seatsInput.max = "";
    hint.textContent = "Select a show to see available seats.";
    return;
  }

  bookState.selectedShow = bookState.shows.find((s) => s.id == showId);
  availEl.innerHTML = `<span class="inline-loading"><div class="spinner"></div> Checking availability…</span>`;
  try {
    const avail = await getAvailableSeats(showId);
    bookState.avail = avail;
    const status = availabilityStatus(avail, bookState.selectedShow.totalSeats);
    availEl.innerHTML = `<span style="font-size:0.88rem;color:var(--card-text)">Available seats: <strong>${avail}</strong> / ${bookState.selectedShow.totalSeats} <span class="badge ${status.class}" style="margin-left:8px">${status.label}</span></span>`;
    seatsInput.max = avail;
    seatsInput.value = Math.min(parseInt(seatsInput.value, 10) || 1, avail);
    hint.textContent = avail > 0 ? `You can book up to ${avail} seat(s).` : "This show is sold out.";
    if (avail <= 0) {
      document.getElementById("booking-submit").disabled = true;
    }
  } catch (err) {
    availEl.innerHTML = `<span style="color:var(--danger);font-size:0.85rem">${escapeHtml(err.message || "Unable to check availability")}</span>`;
    bookState.avail = null;
  }
}

async function submitBooking() {
  const studentId = parseInt(document.getElementById("booking-student").value, 10);
  const showId = parseInt(document.getElementById("booking-show").value, 10);
  const seats = parseInt(document.getElementById("booking-seats").value, 10);
  const errEl = document.getElementById("booking-form-error");
  errEl.textContent = "";

  if (!studentId) { errEl.textContent = "Please select a student."; return; }
  if (!showId) { errEl.textContent = "Please select a show."; return; }
  if (!seats || seats < 1) { errEl.textContent = "Number of seats must be at least 1."; return; }

  // Refresh availability to be safe
  let currentAvail = bookState.avail;
  try {
    currentAvail = await getAvailableSeats(showId);
  } catch { /* backend will validate anyway */ }

  if (currentAvail !== null && seats > currentAvail) {
    errEl.textContent = `Only ${currentAvail} seat(s) available. Please reduce the number of seats.`;
    return;
  }

  const btn = document.getElementById("booking-submit");
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff"></div> Creating booking…`;

  try {
    const booking = await createBooking({ studentId, showId, seats });
    await refreshCache();
    showBookingSuccess(booking);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = `${ICONS.ticket} Book Now`;
    errEl.textContent = err.message || "Unable to create booking.";
  }
}

function showBookingSuccess(booking) {
  const student = bookState.students.find((s) => s.id == booking.studentId) ||
    (booking.student ? booking.student : null);
  const show = bookState.shows.find((s) => s.id == booking.showId) ||
    (booking.show ? booking.show : null);

  openModal({
    title: "Booking Confirmed",
    body: `
      <div class="success-check">${ICONS.check}</div>
      <h3 class="success-title">Booking Confirmed!</h3>
      <p class="success-sub">Your ticket has been booked successfully.</p>
      <div class="detail-grid">
        <div class="detail-item"><label>Booking ID</label><span>#${escapeHtml(booking.id)}</span></div>
        <div class="detail-item"><label>Seats</label><span>${escapeHtml(booking.seats)}</span></div>
        <div class="detail-item"><label>Student</label><span>${escapeHtml(student ? (student.name || `#${booking.studentId}`) : `#${booking.studentId}`)}</span></div>
        <div class="detail-item"><label>Show</label><span>${escapeHtml(show ? (show.title || `#${booking.showId}`) : `#${booking.showId}`)}</span></div>
        <div class="detail-item"><label>Status</label><span class="badge badge-success">CONFIRMED</span></div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="success-close">Close</button>
      <button class="btn btn-primary" id="success-bookings">View My Bookings</button>
    `,
  });

  document.getElementById("success-close").addEventListener("click", () => {
    closeModal();
    renderBookTicket(document.getElementById("content"));
  });
  document.getElementById("success-bookings").addEventListener("click", () => {
    closeModal();
    navigate("bookings");
  });
}

// ============================================================
// MY BOOKINGS PAGE
// ============================================================

let bookingsState = { bookings: [], search: "", statusFilter: "", showFilter: "" };

export async function renderMyBookings(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>My Bookings</h2>
        <p>View and manage all bookings</p>
      </div>
    </div>
    <div class="toolbar">
      <div class="search">
        ${ICONS.search}
        <input type="text" id="booking-search" placeholder="Search by ID, student or show…" />
      </div>
      <select id="booking-status-filter">
        <option value="">All Statuses</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <select id="booking-show-filter">
        <option value="">All Shows</option>
      </select>
    </div>
    <div id="bookings-area">${loadingState("Loading bookings…")}</div>
  `;

  document.getElementById("booking-search").addEventListener("input", (e) => {
    bookingsState.search = e.target.value.toLowerCase();
    renderBookingsTable();
  });
  document.getElementById("booking-status-filter").addEventListener("change", (e) => {
    bookingsState.statusFilter = e.target.value;
    renderBookingsTable();
  });
  document.getElementById("booking-show-filter").addEventListener("change", (e) => {
    bookingsState.showFilter = e.target.value;
    renderBookingsTable();
  });

  await loadBookings();
}

async function loadBookings() {
  const area = document.getElementById("bookings-area");
  area.innerHTML = loadingState("Loading bookings…");
  try {
    const bookings = await getBookings();
    bookingsState.bookings = Array.isArray(bookings) ? bookings : [];
    cache.bookings = bookingsState.bookings;

    // Populate show filter
    const showFilter = document.getElementById("booking-show-filter");
    const shows = await getShows().catch(() => []);
    cache.shows = Array.isArray(shows) ? shows : [];
    showFilter.innerHTML = `<option value="">All Shows</option>` +
      cache.shows.map((s) => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("");

    await renderBookingsTable();
  } catch (err) {
    toast("Unable to load bookings", "error");
    area.innerHTML = emptyState("Unable to load bookings.", "alert");
  }
}

function renderBookingsTable() {
  const area = document.getElementById("bookings-area");
  if (!area) return;

  let filtered = bookingsState.bookings;
  if (bookingsState.search) {
    const q = bookingsState.search;
    filtered = filtered.filter((b) => {
      const sName = b.student ? b.student.name : "";
      const sTitle = b.show ? b.show.title : "";
      return String(b.id).includes(q) || (sName || "").toLowerCase().includes(q) || (sTitle || "").toLowerCase().includes(q);
    });
  }
  if (bookingsState.statusFilter) {
    filtered = filtered.filter((b) => (b.status || "").toUpperCase() === bookingsState.statusFilter);
  }
  if (bookingsState.showFilter) {
    filtered = filtered.filter((b) => String(b.showId) === bookingsState.showFilter);
  }

  if (filtered.length === 0) {
    area.innerHTML = emptyState("No bookings found.", "bookings");
    return;
  }

  area.innerHTML = `
    <div class="table-wrap"><div class="table-scroll">
      <table>
        <thead>
          <tr><th>Booking ID</th><th>Student</th><th>Email</th><th>Show</th><th>Date</th><th>Time</th><th>Seats</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${filtered.map((b) => {
            const student = b.student || cache.students.find((s) => s.id == b.studentId) || {};
            const show = b.show || cache.shows.find((s) => s.id == b.showId) || {};
            const status = (b.status || "").toUpperCase();
            return `
              <tr>
                <td><a href="#/booking/${b.id}" style="font-weight:600">#${escapeHtml(b.id)}</a></td>
                <td>${escapeHtml(student.name || `#${b.studentId}`)}</td>
                <td>${escapeHtml(student.email || "—")}</td>
                <td>${escapeHtml(show.title || `#${b.showId}`)}</td>
                <td>${formatDate(show.showTime || b.showTime)}</td>
                <td>${formatTime(show.showTime || b.showTime)}</td>
                <td>${escapeHtml(b.seats)}</td>
                <td>${statusBadge(b.status)}</td>
                <td>
                  ${status === "CONFIRMED"
                    ? `<button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>`
                    : `<span style="color:var(--card-muted);font-size:0.85rem">Cancelled</span>`
                  }
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div></div>
  `;

  area.querySelectorAll("[data-cancel]").forEach((btn) =>
    btn.addEventListener("click", () => cancelBookingConfirm(parseInt(btn.dataset.cancel, 10)))
  );
}

async function cancelBookingConfirm(id) {
  const confirmed = await confirmDialog({
    title: "Cancel Booking",
    message: `Are you sure you want to cancel booking #${id}?`,
    confirmText: "Cancel Booking",
    cancelText: "Keep Booking",
    danger: true,
  });
  if (!confirmed) return;

  try {
    await cancelBooking(id);
    toast("Booking cancelled successfully", "success");
    await refreshCache();
    await loadBookings();
  } catch (err) {
    toast(err.message || "Unable to cancel booking", "error");
  }
}

// ============================================================
// BOOKING DETAILS
// ============================================================

export async function renderBookingDetails(container, id) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <button class="btn btn-ghost btn-sm" id="back-btn">${ICONS.arrowLeft} Back</button>
      </div>
    </div>
    <div id="detail-area">${loadingState("Loading booking details…")}</div>
  `;
  document.getElementById("back-btn").addEventListener("click", () => navigate("bookings"));

  const area = document.getElementById("detail-area");
  if (!id) {
    area.innerHTML = emptyState("No booking selected.", "alert");
    return;
  }

  try {
    const booking = await getBooking(id);
    const student = booking.student || cache.students.find((s) => s.id == booking.studentId) || {};
    const show = booking.show || cache.shows.find((s) => s.id == booking.showId) || {};
    const status = (booking.status || "").toUpperCase();

    area.innerHTML = `
      <div class="card" style="max-width:580px">
        <h2 style="margin-bottom:6px;color:var(--card-text)">Booking #${escapeHtml(booking.id)}</h2>
        <div style="margin-bottom:22px">${statusBadge(booking.status)}</div>
        <h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--card-muted);margin-bottom:10px">Student</h3>
        <div class="detail-grid" style="margin-bottom:20px">
          <div class="detail-item"><label>Name</label><span>${escapeHtml(student.name || `#${booking.studentId}`)}</span></div>
          <div class="detail-item"><label>Email</label><span>${escapeHtml(student.email || "—")}</span></div>
        </div>
        <h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--card-muted);margin-bottom:10px">Show</h3>
        <div class="detail-grid" style="margin-bottom:20px">
          <div class="detail-item"><label>Title</label><span>${escapeHtml(show.title || `#${booking.showId}`)}</span></div>
          <div class="detail-item"><label>Date</label><span>${formatDate(show.showTime)}</span></div>
          <div class="detail-item"><label>Time</label><span>${formatTime(show.showTime)}</span></div>
        </div>
        <h3 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--card-muted);margin-bottom:10px">Seats</h3>
        <div class="detail-grid" style="margin-bottom:24px">
          <div class="detail-item"><label>Number of Seats</label><span>${escapeHtml(booking.seats)}</span></div>
          <div class="detail-item"><label>Status</label><span>${statusBadge(booking.status)}</span></div>
        </div>
        <div style="display:flex;gap:10px">
          ${status === "CONFIRMED"
            ? `<button class="btn btn-danger" id="detail-cancel">${ICONS.x} Cancel Booking</button>`
            : `<span style="color:var(--card-muted)">This booking has been cancelled.</span>`
          }
          <button class="btn btn-ghost" id="detail-back">Back to Bookings</button>
        </div>
      </div>
    `;

    const cancelBtn = document.getElementById("detail-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
          title: "Cancel Booking",
          message: `Are you sure you want to cancel booking #${booking.id}?`,
          confirmText: "Cancel Booking",
          cancelText: "Keep Booking",
          danger: true,
        });
        if (!confirmed) return;
        try {
          await cancelBooking(booking.id);
          toast("Booking cancelled successfully", "success");
          await refreshCache();
          renderBookingDetails(container, booking.id);
        } catch (err) {
          toast(err.message || "Unable to cancel booking", "error");
        }
      });
    }
    document.getElementById("detail-back").addEventListener("click", () => navigate("bookings"));
  } catch (err) {
    toast(err.message || "Unable to load booking details", "error");
    area.innerHTML = emptyState("Unable to load booking details.", "alert");
  }
}
