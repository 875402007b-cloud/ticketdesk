// ============================================================
// students.js – Students management page (CRUD)
// ============================================================

import { getStudents, createStudent, updateStudent, deleteStudent } from "./api.js";
import {
  ICONS, loadingState, emptyState, toast, openModal, closeModal, confirmDialog,
  escapeHtml, isValidEmail, cache,
} from "./utils.js";
import { refreshCache } from "./app.js";

let studentsState = { students: [], search: "" };

export async function renderStudents(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Students</h2>
        <p>Manage registered students</p>
      </div>
      <button class="btn btn-accent" id="add-student-btn">${ICONS.plus} Add Student</button>
    </div>
    <div class="toolbar">
      <div class="search">
        ${ICONS.search}
        <input type="text" id="student-search" placeholder="Search by name or email…" />
      </div>
    </div>
    <div id="students-area">${loadingState("Loading students…")}</div>
  `;

  document.getElementById("add-student-btn").addEventListener("click", () => openStudentForm());
  document.getElementById("student-search").addEventListener("input", (e) => {
    studentsState.search = e.target.value.toLowerCase();
    renderStudentsTable();
  });

  await loadStudents();
}

async function loadStudents() {
  const area = document.getElementById("students-area");
  area.innerHTML = loadingState("Loading students…");
  try {
    const students = await getStudents();
    studentsState.students = Array.isArray(students) ? students : [];
    cache.students = studentsState.students;
    await renderStudentsTable();
  } catch (err) {
    toast("Unable to load students", "error");
    area.innerHTML = emptyState("Unable to load students.", "alert");
  }
}

function renderStudentsTable() {
  const area = document.getElementById("students-area");
  if (!area) return;

  let filtered = studentsState.students;
  if (studentsState.search) {
    const q = studentsState.search;
    filtered = filtered.filter(
      (s) => (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    area.innerHTML = emptyState("No students registered.", "students");
    return;
  }

  area.innerHTML = `
    <div class="table-wrap"><div class="table-scroll">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
        <tbody>
          ${filtered.map((s) => `
            <tr>
              <td>#${s.id}</td>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.email)}</td>
              <td class="table-actions">
                <button class="btn-icon" data-edit="${s.id}" title="Edit">${ICONS.edit}</button>
                <button class="btn-icon danger" data-delete="${s.id}" title="Delete">${ICONS.trash}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div></div>
  `;

  area.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openStudentForm(parseInt(btn.dataset.edit, 10)))
  );
  area.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => deleteStudentConfirm(parseInt(btn.dataset.delete, 10)))
  );
}

function openStudentForm(editId = null) {
  const isEdit = editId !== null;
  const existing = isEdit ? studentsState.students.find((s) => s.id === editId) : null;

  openModal({
    title: isEdit ? "Edit Student" : "Add Student",
    body: `
      <form id="student-form">
        <div class="form-group">
          <label for="student-name">Name</label>
          <input class="form-control" id="student-name" value="${isEdit ? escapeHtml(existing.name) : ""}" required />
        </div>
        <div class="form-group">
          <label for="student-email">Email</label>
          <input class="form-control" type="email" id="student-email" value="${isEdit ? escapeHtml(existing.email) : ""}" required />
          <div class="form-hint">Enter a valid email address.</div>
        </div>
        <div class="form-error" id="student-form-error"></div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" id="student-cancel">Cancel</button>
      <button class="btn btn-primary" id="student-submit">${isEdit ? "Update" : "Add"} Student</button>
    `,
  });

  document.getElementById("student-cancel").addEventListener("click", closeModal);
  document.getElementById("student-submit").addEventListener("click", () => submitStudentForm(editId));
}

async function submitStudentForm(editId) {
  const name = document.getElementById("student-name").value.trim();
  const email = document.getElementById("student-email").value.trim();
  const errEl = document.getElementById("student-form-error");
  errEl.textContent = "";

  if (!name) { errEl.textContent = "Name is required."; return; }
  if (!email) { errEl.textContent = "Email is required."; return; }
  if (!isValidEmail(email)) { errEl.textContent = "Please enter a valid email address."; return; }

  const payload = { name, email };
  const btn = document.getElementById("student-submit");
  btn.disabled = true;
  btn.textContent = editId ? "Updating…" : "Adding…";

  try {
    if (editId) {
      await updateStudent(editId, payload);
      toast("Student updated successfully", "success");
    } else {
      await createStudent(payload);
      toast("Student created successfully", "success");
    }
    closeModal();
    await refreshCache();
    await loadStudents();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = editId ? "Update" : "Add";
    errEl.textContent = err.message || "Unable to save student.";
  }
}

async function deleteStudentConfirm(id) {
  const student = studentsState.students.find((s) => s.id === id);
  const confirmed = await confirmDialog({
    title: "Delete Student",
    message: `Are you sure you want to delete ${student ? student.name : `Student #${id}`}? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Keep",
    danger: true,
  });
  if (!confirmed) return;

  try {
    await deleteStudent(id);
    toast("Student deleted successfully", "success");
    await refreshCache();
    await loadStudents();
  } catch (err) {
    toast(err.message || "Unable to delete student", "error");
  }
}
