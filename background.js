const STORAGE_KEY = "reminderTasks";
const ALARM_PREFIX = "reminder:";

async function getTasks() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] ?? [];
}

async function saveTasks(tasks) {
  await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
}

async function schedulePendingTasks() {
  const tasks = await getTasks();
  const alarms = await chrome.alarms.getAll();

  for (const alarm of alarms) {
    if (alarm.name.startsWith(ALARM_PREFIX)) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  for (const task of tasks) {
    if (task.done || task.notified) continue;

    const dueAt = new Date(task.dueAt).getTime();
    if (!Number.isFinite(dueAt)) continue;

    // Se il promemoria è scaduto mentre Chrome era chiuso, mostralo al prossimo avvio.
    await chrome.alarms.create(`${ALARM_PREFIX}${task.id}`, {
      when: Math.max(dueAt, Date.now() + 1000)
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void schedulePendingTasks();
});

chrome.runtime.onStartup.addListener(() => {
  void schedulePendingTasks();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  const id = alarm.name.slice(ALARM_PREFIX.length);
  const tasks = await getTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task || task.done || task.notified) return;

  await chrome.notifications.create(`notification:${id}`, {
    type: "basic",
    iconUrl: "icons/reminder.svg",
    title: "Promemoria",
    message: task.title,
    priority: 1
  });

  await saveTasks(tasks.map((item) => item.id === id ? { ...item, notified: true } : item));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "tasks-changed") return;
  schedulePendingTasks()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});
