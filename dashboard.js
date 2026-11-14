const STORAGE_KEY = "reminderTasks";
const THEME_KEY = "reminderTheme";
const form = document.querySelector("#task-form");
const taskIdInput = document.querySelector("#task-id");
const titleInput = document.querySelector("#task-title");
const dueInput = document.querySelector("#task-due");
const categoryInput = document.querySelector("#task-category");
const priorityInput = document.querySelector("#task-priority");
const repeatInput = document.querySelector("#task-repeat");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
let activeFilter = "all";
const filterLabels = { all: "Tutte le attività", today: "Attività di oggi", upcoming: "In arrivo", completed: "Completate" };
const priorityRank = { alta: 0, normale: 1, bassa: 2 };

function localDateTimeValue(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function dateKey(date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
function getTasks() { return chrome.storage.local.get(STORAGE_KEY).then((data) => data[STORAGE_KEY] ?? []); }
function saveTasks(tasks) { return chrome.storage.local.set({ [STORAGE_KEY]: tasks }).then(() => chrome.runtime.sendMessage({ type: "tasks-changed" }).catch(() => {})); }
function formatDate(value) { return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function isToday(value) { return dateKey(new Date(value)) === dateKey(new Date()); }
function isOverdue(task) { return !task.done && new Date(task.dueAt).getTime() < Date.now(); }
function announce(message) { status.textContent = message; }

async function applyTheme() {
  const saved = await chrome.storage.local.get(THEME_KEY);
  const dark = saved[THEME_KEY] === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const button = document.querySelector("#theme-toggle");
  button.textContent = dark ? "☀ Tema chiaro" : "☾ Tema scuro";
  button.setAttribute("aria-label", dark ? "Attiva tema chiaro" : "Attiva tema scuro");
}
document.querySelector("#theme-toggle").addEventListener("click", async () => {
  const saved = await chrome.storage.local.get(THEME_KEY);
  await chrome.storage.local.set({ [THEME_KEY]: saved[THEME_KEY] === "dark" ? "light" : "dark" });
  await applyTheme();
});

function showEditor(editing = false) {
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
  categoryInput.value = task.category || "Personale";
  priorityInput.value = task.priority || "normale";
  repeatInput.value = task.repeat || "none";
  showEditor(true); titleInput.focus();
  document.querySelector("#editor-card").scrollIntoView({ behavior: "smooth", block: "center" });
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
    if (mode === "priority") return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) || new Date(a.dueAt) - new Date(b.dueAt);
    return new Date(a.dueAt) - new Date(b.dueAt);
  });
}
function makeAction(label, className, action) {
  const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", action); return button;
}
function renderTask(task) {
  const row = document.createElement("li"); row.className = `task-row${task.done ? " completed" : ""}`;
  const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.className = "task-check"; checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Segna ${task.title} come ${task.done ? "da fare" : "completata"}`);
  checkbox.addEventListener("change", async () => {
    const tasks = await getTasks();
    await saveTasks(tasks.map((item) => item.id === task.id ? { ...item, done: checkbox.checked } : item));
    announce(checkbox.checked ? "Attività completata." : "Attività riaperta.");
  });
  const name = document.createElement("div"); name.className = "task-name";
  const title = document.createElement("strong"); title.textContent = task.title;
  const meta = document.createElement("small");
  meta.textContent = `${task.category || "Personale"} · Priorità ${task.priority || "normale"}${task.repeat === "daily" ? " · ogni giorno" : ""}`;
  name.append(title, meta);
  const date = document.createElement("time"); date.className = `task-date${isOverdue(task) ? " overdue" : ""}`;
  date.dateTime = task.dueAt; date.textContent = isOverdue(task) ? `Scaduta · ${formatDate(task.dueAt)}` : formatDate(task.dueAt);
  const category = document.createElement("span"); category.className = "badge"; category.textContent = task.category || "Personale";
  const priority = document.createElement("span"); priority.className = `priority ${task.priority || "normale"}`;
  priority.textContent = task.priority === "alta" ? "Alta" : task.priority === "bassa" ? "Bassa" : "Normale";
  const actions = document.createElement("div"); actions.className = "row-actions";
  if (task.calendarSource) {
    const source = document.createElement("span"); source.className = "calendar-source"; source.textContent = "▦ Calendario"; source.title = task.calendarName || "Importato da calendario";
    actions.append(source);
  }
  actions.append(makeAction("Modifica", "edit", () => beginEdit(task)), makeAction("Elimina", "delete", async () => {
    if (!confirm(`Vuoi eliminare “${task.title}”?`)) return;
    const tasks = await getTasks(); await saveTasks(tasks.filter((item) => item.id !== task.id)); announce("Attività eliminata.");
  }));
  row.append(checkbox, name, date, category, priority, actions); return row;
}
async function render() {
  const tasks = await getTasks(); const pending = tasks.filter((task) => !task.done);
  document.querySelector("#stat-pending").textContent = String(pending.length);
  document.querySelector("#stat-today").textContent = String(pending.filter((task) => isToday(task.dueAt)).length);
  document.querySelector("#stat-completed").textContent = String(tasks.filter((task) => task.done).length);
  document.querySelector("#date-label").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  document.querySelector("#list-heading").textContent = filterLabels[activeFilter];
  const query = document.querySelector("#search").value.trim().toLocaleLowerCase("it");
  const category = document.querySelector("#category-filter").value;
  const visible = sortTasks(tasks.filter((task) => taskMatchesFilter(task)
    && (category === "all" || (task.category || "Personale") === category)
    && (!query || `${task.title} ${task.category || "Personale"} ${task.calendarName || ""}`.toLocaleLowerCase("it").includes(query))));
  list.replaceChildren(...visible.map(renderTask));
  emptyState.hidden = visible.length > 0;
  document.querySelector("#clear-completed").hidden = !tasks.some((task) => task.done);
  document.querySelector("#clear-all").hidden = tasks.length === 0;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); const title = titleInput.value.trim(); const dueAt = new Date(dueInput.value);
  if (!title || !Number.isFinite(dueAt.getTime())) { announce("Inserisci un titolo e una data valida."); return; }
  if (dueAt.getTime() <= Date.now()) { announce("Scegli un orario futuro."); return; }
  const tasks = await getTasks();
  if (taskIdInput.value) {
    await saveTasks(tasks.map((task) => task.id === taskIdInput.value
      ? { ...task, title, dueAt: dueAt.toISOString(), category: categoryInput.value, priority: priorityInput.value, repeat: repeatInput.value, notified: false }
      : task));
    announce("Modifiche salvate.");
  } else {
    tasks.push({ id: crypto.randomUUID(), title, dueAt: dueAt.toISOString(), category: categoryInput.value, priority: priorityInput.value, repeat: repeatInput.value, done: false, notified: false });
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
  const tasks = await getTasks(); const count = tasks.filter((task) => task.done).length;
  if (!count || !confirm(`Eliminare ${count} ${count === 1 ? "attività completata" : "attività completate"}?`)) return;
  await saveTasks(tasks.filter((task) => !task.done)); announce("Attività completate rimosse.");
});
document.querySelector("#clear-all").addEventListener("click", async () => {
  const tasks = await getTasks();
  if (!tasks.length || !confirm(`Eliminare definitivamente tutti i ${tasks.length} promemoria, inclusi quelli importati dal calendario?`)) return;
  await saveTasks([]); resetForm(); announce("Tutti i promemoria sono stati rimossi.");
});

// Import locale di file iCalendar (.ics): nessuna credenziale o connessione remota è richiesta.
function unfoldIcsLines(text) { return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/); }
function parseIcsProperty(line) {
  const separator = line.indexOf(":");
  if (separator < 0) return null;
  const left = line.slice(0, separator).split(";");
  const params = {};
  for (const part of left.slice(1)) {
    const equal = part.indexOf("=");
    if (equal > 0) params[part.slice(0, equal).toUpperCase()] = part.slice(equal + 1).replace(/^"|"$/g, "");
  }
  return { name: left[0].toUpperCase(), params, value: line.slice(separator + 1) };
}
function unescapeIcsText(value) { return value.replace(/\\[nN]/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\"); }
function wallTimeInZone(year, month, day, hour, minute, second, timeZone) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const difference = target - represented;
    guess += difference;
    if (difference === 0) break;
  }
  return new Date(guess);
}
function parseIcsDate(property) {
  const value = property.value.trim();
  const dateOnly = property.params.VALUE?.toUpperCase() === "DATE" || /^\d{8}$/.test(value);
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i);
  if (!match) return null;
  const [, y, mo, d, hh = "09", mm = "00", ss = "00", utc] = match;
  const parts = [Number(y), Number(mo), Number(d), Number(hh), Number(mm), Number(ss)];
  if (dateOnly) return { date: new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0), allDay: true };
  if (utc) return { date: new Date(Date.UTC(...parts)), allDay: false };
  const zone = property.params.TZID;
  if (zone) {
    try { return { date: wallTimeInZone(...parts, zone), allDay: false }; }
    catch { /* fallback al fuso orario locale */ }
  }
  return { date: new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]), allDay: false };
}
function parseCalendarEvents(text, calendarName) {
  const lines = unfoldIcsLines(text);
  const events = []; let current = null;
  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VEVENT") { current = {}; continue; }
    if (line.toUpperCase() === "END:VEVENT") { if (current) events.push(current); current = null; continue; }
    if (!current) continue;
    const property = parseIcsProperty(line);
    if (property && ["UID", "SUMMARY", "DTSTART", "STATUS"].includes(property.name)) current[property.name] = property;
  }
  return events.flatMap((event) => {
    if (!event.DTSTART || event.STATUS?.value.toUpperCase() === "CANCELLED") return [];
    const parsed = parseIcsDate(event.DTSTART);
    if (!parsed || parsed.date.getTime() <= Date.now()) return [];
    const uid = event.UID?.value || `${event.SUMMARY?.value || "evento"}-${event.DTSTART.value}`;
    const title = unescapeIcsText(event.SUMMARY?.value || "Evento di calendario").trim().slice(0, 120);
    const sourceId = `ics:${uid}:${parsed.date.toISOString()}`;
    return [{ id: sourceId, sourceId, calendarSource: true, calendarName, title, dueAt: parsed.date.toISOString(), category: "Calendario", priority: "normale", repeat: "none", allDay: parsed.allDay, done: false, notified: false }];
  });
}

document.querySelector("#import-calendar").addEventListener("click", () => document.querySelector("#calendar-file").click());
document.querySelector("#calendar-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const text = await file.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Il file non sembra un calendario iCalendar valido (.ics).");
    const calendarName = file.name.replace(/\.ics$/i, "") || "Calendario importato";
    const imported = parseCalendarEvents(text, calendarName);
    const tasks = await getTasks();
    const byId = new Map(tasks.map((task) => [task.id, task]));
    let added = 0; let updated = 0;
    for (const incoming of imported) {
      const existing = byId.get(incoming.id);
      byId.set(incoming.id, existing ? { ...existing, ...incoming, done: existing.done, notified: existing.notified } : incoming);
      existing ? updated++ : added++;
    }
    await saveTasks([...byId.values()]); await render();
    announce(`Calendario importato: ${added} nuovi eventi${updated ? `, ${updated} aggiornati` : ""}.`);
    if (!imported.length) announce("Nessun evento futuro importabile trovato nel file.");
  } catch (error) {
    announce(error instanceof Error ? error.message : "Impossibile leggere il file del calendario.");
  } finally { event.target.value = ""; }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEY]) void render();
  if (changes[THEME_KEY]) void applyTheme();
});
dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
void applyTheme(); void render();
