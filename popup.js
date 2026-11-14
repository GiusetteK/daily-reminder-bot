const STORAGE_KEY = "reminderTasks";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dueInput = document.querySelector("#task-due");
const list = document.querySelector("#task-list");
const count = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getTasks() {
  return chrome.storage.local.get(STORAGE_KEY)
    .then((stored) => stored[STORAGE_KEY] ?? []);
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function makeButton(label, className, action, taskId) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.setAttribute("aria-label", `${label} promemoria`);
  button.addEventListener("click", () => action(taskId));
  return button;
}

async function renderTasks() {
  const tasks = await getTasks();
  tasks.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  list.replaceChildren();

  const pendingCount = tasks.filter((task) => !task.done).length;
  count.textContent = String(pendingCount);
  emptyState.hidden = tasks.length > 0;

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = `task${task.done ? " task-done" : ""}`;

    const details = document.createElement("div");
    details.className = "task-details";
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    const due = document.createElement("time");
    due.className = "task-time";
    due.dateTime = task.dueAt;
    due.textContent = task.done ? "Completata" : formatDate(task.dueAt);
    details.append(title, due);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    if (!task.done) {
      actions.append(makeButton("Fatto", "complete-button", markDone, task.id));
    }
    actions.append(makeButton("Elimina", "delete-button", deleteTask, task.id));
    item.append(details, actions);
    list.append(item);
  }
}

async function updateTasks(mutator) {
  const tasks = await getTasks();
  await chrome.storage.local.set({ [STORAGE_KEY]: mutator(tasks) });
  chrome.runtime.sendMessage({ type: "tasks-changed" }).catch(() => {});
  await renderTasks();
}

function markDone(id) {
  return updateTasks((tasks) => tasks.map((task) =>
    task.id === id ? { ...task, done: true } : task
  ));
}

function deleteTask(id) {
  return updateTasks((tasks) => tasks.filter((task) => task.id !== id));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const dueAt = new Date(dueInput.value);

  if (!title || !Number.isFinite(dueAt.getTime())) {
    status.textContent = "Inserisci un'attività e una data valida.";
    return;
  }
  if (dueAt.getTime() <= Date.now()) {
    status.textContent = "Scegli un orario nel futuro.";
    return;
  }

  const tasks = await getTasks();
  tasks.push({ id: crypto.randomUUID(), title, dueAt: dueAt.toISOString(), done: false, notified: false });
  await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
  chrome.runtime.sendMessage({ type: "tasks-changed" }).catch(() => {});

  form.reset();
  dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  status.textContent = "Promemoria aggiunto!";
  await renderTasks();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) void renderTasks();
});

dueInput.value = localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
void renderTasks();
