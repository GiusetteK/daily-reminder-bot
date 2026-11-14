const STORAGE_KEY = "reminderTasks";
const ALARM_PREFIX = "reminder:";

async function getTasks() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] ?? [];
}

async function schedulePendingTasks() {
  const tasks = await getTasks();
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith(ALARM_PREFIX)) await chrome.alarms.clear(alarm.name);
  }

  for (const task of tasks) {
    if (task.done || task.notified) continue;
    const dueAt = new Date(task.dueAt).getTime();
    if (!Number.isFinite(dueAt)) continue;
    await chrome.alarms.create(`${ALARM_PREFIX}${task.id}`, {
      when: Math.max(dueAt, Date.now() + 1000)
    });
  }
}

chrome.runtime.onInstalled.addListener(() => { void schedulePendingTasks(); });
chrome.runtime.onStartup.addListener(() => { void schedulePendingTasks(); });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const id = alarm.name.slice(ALARM_PREFIX.length);
  const tasks = await getTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task || task.done || task.notified) return;

  await chrome.notifications.create(`notification:${id}`, {
    type: "basic",
    iconUrl: "icons/reminder.svg",
    title: task.repeat === "daily" ? "Promemoria giornaliero" : "Promemoria",
    message: task.title,
    priority: 1
  });

  if (task.repeat === "daily") {
    // Incrementa il giorno di calendario locale per mantenere l'orario anche ai cambi DST.
    const nextDue = new Date(task.dueAt);
    const now = new Date();
    do { nextDue.setDate(nextDue.getDate() + 1); } while (nextDue.getTime() <= now.getTime());
    const updated = tasks.map((item) => item.id === id
      ? { ...item, dueAt: nextDue.toISOString(), notified: false }
      : item);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    await chrome.alarms.create(`${ALARM_PREFIX}${id}`, { when: nextDue.getTime() });
  } else {
    await chrome.storage.local.set({
      [STORAGE_KEY]: tasks.map((item) => item.id === id ? { ...item, notified: true } : item)
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "tasks-changed") return;
  schedulePendingTasks()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});
