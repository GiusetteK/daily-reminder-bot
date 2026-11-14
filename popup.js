const STORAGE_KEY = "reminderTasks";
const form = document.querySelector("#quick-form");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
const dueInput = document.querySelector("#task-due");

function localDateTimeValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function getTasks() { return chrome.storage.local.get(STORAGE_KEY).then((data) => data[STORAGE_KEY] ?? []); }
function dayKey(date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
function formatDue(value) {
  const date = new Date(value);
  if (dayKey(date) === dayKey(new Date())) return `Oggi, ${date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function openDashboard() { chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }); }
document.querySelector("#open-dashboard").addEventListener("click", openDashboard);
document.querySelector("#see-all").addEventListener("click", openDashboard);

async function render() {
  const tasks = await getTasks();
  const pending = tasks.filter((task) => !task.done).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const today = pending.filter((task) => dayKey(new Date(task.dueAt)) === dayKey(new Date()));
  document.querySelector("#today-heading").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  document.querySelector("#today-count").textContent = String(today.length);
  document.querySelector("#today-summary").textContent = today.length ? `${today.length} ${today.length === 1 ? "attività da completare" : "attività da completare"}` : "La tua giornata è libera!";
  list.replaceChildren();
  for (const task of pending.slice(0, 3)) {
    const item = document.createElement("li"); item.className = "task";
    const dot = document.createElement("span"); dot.className = "task-dot";
    const info = document.createElement("div"); info.className = "task-info";
    const title = document.createElement("span"); title.className = "task-title"; title.textContent = task.title;
    const time = document.createElement("span"); time.className = "task-time"; time.textContent = formatDue(task.dueAt);
    info.append(title, time);
    const category = document.createElement("span"); category.className = "task-category"; category.textContent = task.category || "Personale";
    item.append(dot, info, category); list.append(item);
  }
  emptyState.hidden = pending.length > 0;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const titleInput = document.querySelector("#task-title");
  const dueAt = new Date(dueInput.value);
  if (!titleInput.value.trim() || !Number.isFinite(dueAt.getTime()) || dueAt <= new Date()) {
    status.textContent = "Inserisci un'attività e scegli un orario futuro."; return;
  }
  const tasks = await getTasks();
  tasks.push({ id: crypto.randomUUID(), title: titleInput.value.trim(), dueAt: dueAt.toISOString(), category: document.querySelector("#task-category").value, priority: "normale", done: false, notified: false });
  await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
  chrome.runtime.sendMessage({ type: "tasks-changed" }).catch(() => {});
  form.reset(); dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  status.textContent = "Promemoria aggiunto!"; await render();
});
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes[STORAGE_KEY]) void render(); });
dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
void render();
