const STORAGE_KEY = "reminderTasks";
const form = document.querySelector("#task-form");
const taskIdInput = document.querySelector("#task-id");
const titleInput = document.querySelector("#task-title");
const dueInput = document.querySelector("#task-due");
const categoryInput = document.querySelector("#task-category");
const priorityInput = document.querySelector("#task-priority");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
let activeFilter = "all";

const filterLabels = { all: "Tutte le attività", today: "Attività di oggi", upcoming: "In arrivo", completed: "Completate" };
function localDateTimeValue(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function dateKey(date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
function getTasks() { return chrome.storage.local.get(STORAGE_KEY).then((data) => data[STORAGE_KEY] ?? []); }
function saveTasks(tasks) {
  return chrome.storage.local.set({ [STORAGE_KEY]: tasks }).then(() => chrome.runtime.sendMessage({ type: "tasks-changed" }).catch(() => {}));
}
function formatDate(value) { return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function isToday(value) { return dateKey(new Date(value)) === dateKey(new Date()); }
function isOverdue(task) { return !task.done && new Date(task.dueAt).getTime() < Date.now(); }
function announce(message) { status.textContent = message; }

function showEditor(editing = false) {
  document.querySelector("#editor-card").classList.remove("collapsed");
  document.querySelector("#form-heading").textContent = editing ? "Modifica attività" : "Crea un promemoria";
  document.querySelector("#save-task").textContent = editing ? "Salva modifiche" : "Salva attività";
  document.querySelector("#cancel-edit").hidden = !editing;
  document.querySelector("#close-editor").style.display = editing ? "block" : "none";
}
function resetForm() {
  form.reset(); taskIdInput.value = "";
  dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  showEditor(false);
}
function beginEdit(task) {
  taskIdInput.value = task.id; titleInput.value = task.title;
  dueInput.value = localDateTimeValue(new Date(task.dueAt));
  categoryInput.value = task.category || "Personale"; priorityInput.value = task.priority || "normale";
  showEditor(true); titleInput.focus(); document.querySelector("#editor-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

function taskMatchesFilter(task) {
  if (activeFilter === "today") return !task.done && isToday(task.dueAt);
  if (activeFilter === "upcoming") return !task.done && !isToday(task.dueAt);
  if (activeFilter === "completed") return task.done;
  return true;
}
function sortTasks(tasks) {
  const mode = document.querySelector("#sort").value;
  return tasks.sort((a, b) => {
    if (mode === "title") return a.title.localeCompare(b.title, "it");
    if (mode === "priority") {
      const rank = { alta: 0, normale: 1, bassa: 2 };
      return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1) || new Date(a.dueAt) - new Date(b.dueAt);
    }
    return new Date(a.dueAt) - new Date(b.dueAt);
  });
}

function makeAction(label, className, action) {
  const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", action); return button;
}
function renderTask(task) {
  const row = document.createElement("li"); row.className = `task-row${task.done ? " completed" : ""}`;
  const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.className = "task-check"; checkbox.checked = task.done; checkbox.setAttribute("aria-label", `Segna ${task.title} come ${task.done ? "da fare" : "completata"}`);
  checkbox.addEventListener("change", async () => {
    const tasks = await getTasks(); await saveTasks(tasks.map((item) => item.id === task.id ? { ...item, done: checkbox.checked } : item));
    announce(checkbox.checked ? "Attività completata." : "Attività riaperta.");
  });
  const name = document.createElement("div"); name.className = "task-name";
  const title = document.createElement("strong"); title.textContent = task.title;
  const meta = document.createElement("small"); meta.textContent = `${task.category || "Personale"} · Priorità ${task.priority || "normale"}`;
  name.append(title, meta);
  const date = document.createElement("time"); date.className = `task-date${isOverdue(task) ? " overdue" : ""}`; date.dateTime = task.dueAt; date.textContent = isOverdue(task) ? `Scaduta · ${formatDate(task.dueAt)}` : formatDate(task.dueAt);
  const category = document.createElement("span"); category.className = "badge"; category.textContent = task.category || "Personale";
  const priority = document.createElement("span"); priority.className = `priority ${task.priority || "normale"}`; priority.textContent = task.priority === "alta" ? "Alta" : task.priority === "bassa" ? "Bassa" : "Normale";
  const actions = document.createElement("div"); actions.className = "row-actions";
  actions.append(makeAction("Modifica", "edit", () => beginEdit(task)), makeAction("Elimina", "delete", async () => {
    if (!confirm(`Vuoi eliminare “${task.title}”?`)) return;
    const tasks = await getTasks(); await saveTasks(tasks.filter((item) => item.id !== task.id)); announce("Attività eliminata.");
  }));
  row.append(checkbox, name, date, category, priority, actions); return row;
}

async function render() {
  const tasks = await getTasks();
  const pending = tasks.filter((task) => !task.done);
  const todayCount = pending.filter((task) => isToday(task.dueAt)).length;
  document.querySelector("#stat-pending").textContent = String(pending.length);
  document.querySelector("#stat-today").textContent = String(todayCount);
  document.querySelector("#stat-completed").textContent = String(tasks.filter((task) => task.done).length);
  document.querySelector("#date-label").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  document.querySelector("#list-heading").textContent = filterLabels[activeFilter];
  const query = document.querySelector("#search").value.trim().toLocaleLowerCase("it");
  const category = document.querySelector("#category-filter").value;
  const visible = sortTasks(tasks.filter((task) => taskMatchesFilter(task)
    && (category === "all" || (task.category || "Personale") === category)
    && (!query || `${task.title} ${task.category || "Personale"}`.toLocaleLowerCase("it").includes(query))));
  list.replaceChildren(...visible.map(renderTask));
  emptyState.hidden = visible.length > 0;
  document.querySelector("#clear-completed").hidden = !tasks.some((task) => task.done);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim(); const dueAt = new Date(dueInput.value);
  if (!title || !Number.isFinite(dueAt.getTime())) { announce("Inserisci un titolo e una data valida."); return; }
  if (!taskIdInput.value && dueAt.getTime() <= Date.now()) { announce("Scegli un orario futuro."); return; }
  const tasks = await getTasks();
  if (taskIdInput.value) {
    await saveTasks(tasks.map((task) => task.id === taskIdInput.value ? { ...task, title, dueAt: dueAt.toISOString(), category: categoryInput.value, priority: priorityInput.value, notified: dueAt.getTime() > Date.now() ? false : task.notified } : task));
    announce("Modifiche salvate.");
  } else {
    tasks.push({ id: crypto.randomUUID(), title, dueAt: dueAt.toISOString(), category: categoryInput.value, priority: priorityInput.value, done: false, notified: false });
    await saveTasks(tasks); announce("Promemoria creato.");
  }
  resetForm(); await render();
});

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
  void render();
}));
document.querySelector("#add-task-top").addEventListener("click", () => { resetForm(); titleInput.focus(); });
document.querySelector("#empty-add").addEventListener("click", () => { resetForm(); titleInput.focus(); });
document.querySelector("#cancel-edit").addEventListener("click", resetForm);
document.querySelector("#close-editor").addEventListener("click", resetForm);
document.querySelector("#search").addEventListener("input", () => void render());
document.querySelector("#category-filter").addEventListener("change", () => void render());
document.querySelector("#sort").addEventListener("change", () => void render());
document.querySelector("#clear-completed").addEventListener("click", async () => {
  const tasks = await getTasks(); const completed = tasks.filter((task) => task.done).length;
  if (!completed || !confirm(`Eliminare ${completed} ${completed === 1 ? "attività completata" : "attività completate"}?`)) return;
  await saveTasks(tasks.filter((task) => !task.done)); announce("Attività completate rimosse.");
});
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes[STORAGE_KEY]) void render(); });
dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
void render();
