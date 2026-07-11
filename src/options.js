function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function load() {
  const result = await send({ type: "GET_STATUS" });
  const settings = result?.settings || {};
  document.querySelector("#useCrossref").checked = Boolean(settings.useCrossref);
  document.querySelector("#allowFilenameFallback").checked = Boolean(settings.allowFilenameFallback);
}

document.querySelector("#save").addEventListener("click", async () => {
  await send({
    type: "SET_SETTINGS",
    settings: {
      useCrossref: document.querySelector("#useCrossref").checked,
      allowFilenameFallback: document.querySelector("#allowFilenameFallback").checked
    }
  });
  document.querySelector("#saved").textContent = "已保存";
  window.setTimeout(() => {
    document.querySelector("#saved").textContent = "";
  }, 1800);
});

void load();
