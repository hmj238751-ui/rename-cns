function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderHistory(history) {
  const container = document.querySelector("#history");
  container.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "还没有改名记录。下载一篇 PDF 论文试试。";
    container.append(empty);
    return;
  }
  history.slice(0, 5).forEach((item) => {
    const li = document.createElement("li");
    const filename = document.createElement("div");
    filename.className = "filename";
    filename.textContent = item.renamedFilename;
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTime(item.time);
    li.append(filename, time);
    container.append(li);
  });
}

async function render() {
  const result = await send({ type: "GET_STATUS" });
  const enabled = Boolean(result?.settings?.enabled);
  document.querySelector("#enabled").checked = enabled;
  document.querySelector("#statusText").textContent = enabled ? "正在监听论文下载" : "已暂停自动改名";
  renderHistory(result?.history || []);
}

document.querySelector("#enabled").addEventListener("change", async (event) => {
  await send({ type: "SET_SETTINGS", settings: { enabled: event.target.checked } });
  await render();
});

document.querySelector("#clearHistory").addEventListener("click", async () => {
  await send({ type: "CLEAR_HISTORY" });
  await render();
});

document.querySelector("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

void render();
