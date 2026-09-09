import {
  DEFAULT_FILENAME_TEMPLATE,
  buildFilename,
  validateFilenameSettings
} from "./metadata.js";

const customFieldsContainer = document.querySelector("#customFields");
const customFieldTemplate = document.querySelector("#customFieldTemplate");
const filenameTemplateInput = document.querySelector("#filenameTemplate");
const settingsError = document.querySelector("#settingsError");

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function collectCustomFields() {
  return [...customFieldsContainer.querySelectorAll(".custom-field-row")].map((row) => ({
    name: row.querySelector(".custom-field-name").value.trim(),
    value: row.querySelector(".custom-field-value").value.trim()
  }));
}

function currentFilenameSettings() {
  return {
    filenameTemplate: filenameTemplateInput.value.trim(),
    customFields: collectCustomFields()
  };
}

function validationMessage(error) {
  switch (error?.code) {
    case "empty_filename_template":
      return "请输入文件名模板。";
    case "invalid_template_syntax":
      return "模板中的大括号不完整，请检查字段写法。";
    case "unknown_template_field":
      return `模板中的字段 {${error.field}} 尚未定义。`;
    case "reserved_custom_field_name":
      return `自定义字段“${error.field}”与内置字段重名。`;
    case "duplicate_custom_field_name":
      return `自定义字段“${error.field}”重复了。`;
    case "invalid_custom_field_name":
      return error.field
        ? `字段名“${error.field}”只能包含中文、英文、数字和下划线。`
        : "请填写自定义字段名。";
    case "empty_custom_field_value":
      return `请为自定义字段“${error.field}”填写固定值。`;
    default:
      return "文件名设置有误，请检查后再保存。";
  }
}

function clearValidationState() {
  settingsError.hidden = true;
  settingsError.textContent = "";
  document.querySelectorAll("[aria-invalid='true']").forEach((element) => {
    element.removeAttribute("aria-invalid");
  });
}

function showValidationError(error) {
  clearValidationState();
  settingsError.textContent = validationMessage(error);
  settingsError.hidden = false;

  if (["empty_filename_template", "invalid_template_syntax", "unknown_template_field"].includes(error.code)) {
    filenameTemplateInput.setAttribute("aria-invalid", "true");
    filenameTemplateInput.focus();
    return;
  }

  const rows = [...customFieldsContainer.querySelectorAll(".custom-field-row")];
  const row = rows.find((item) => item.querySelector(".custom-field-name").value.trim() === error.field)
    || rows.find((item) => !item.querySelector(".custom-field-name").value.trim());
  const input = error.code === "empty_custom_field_value"
    ? row?.querySelector(".custom-field-value")
    : row?.querySelector(".custom-field-name");
  input?.setAttribute("aria-invalid", "true");
  input?.focus();
}

function updatePreview() {
  clearValidationState();
  const filenameSettings = currentFilenameSettings();
  const validation = validateFilenameSettings(filenameSettings);
  const preview = document.querySelector("#filenamePreview");
  if (!validation.valid) {
    preview.textContent = "完善设置后显示预览";
    return;
  }

  preview.textContent = buildFilename({
    year: "2026",
    journal: "Nature",
    title: "Example paper title",
    doi: "10.1000/example"
  }, "paper.pdf", filenameSettings);
}

function addCustomField(field = {}) {
  const row = customFieldTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".custom-field-name").value = field.name || "";
  row.querySelector(".custom-field-value").value = field.value || "";
  row.addEventListener("input", updatePreview);
  row.querySelector(".remove-field").addEventListener("click", () => {
    row.remove();
    updatePreview();
  });
  customFieldsContainer.append(row);
}

async function load() {
  const result = await send({ type: "GET_STATUS" });
  const settings = result?.settings || {};
  filenameTemplateInput.value = settings.filenameTemplate || DEFAULT_FILENAME_TEMPLATE;
  document.querySelector("#useCrossref").checked = Boolean(settings.useCrossref);
  document.querySelector("#usePubMed").checked = Boolean(settings.usePubMed);
  document.querySelector("#allowFilenameFallback").checked = Boolean(settings.allowFilenameFallback);
  customFieldsContainer.replaceChildren();
  (Array.isArray(settings.customFields) ? settings.customFields : []).forEach(addCustomField);
  updatePreview();
}

filenameTemplateInput.addEventListener("input", updatePreview);
document.querySelector("#addCustomField").addEventListener("click", () => {
  addCustomField();
  customFieldsContainer.lastElementChild?.querySelector(".custom-field-name")?.focus();
  updatePreview();
});

document.querySelector("#save").addEventListener("click", async () => {
  const filenameSettings = currentFilenameSettings();
  const validation = validateFilenameSettings(filenameSettings);
  if (!validation.valid) {
    showValidationError(validation.errors[0]);
    return;
  }

  const result = await send({
    type: "SET_SETTINGS",
    settings: {
      ...filenameSettings,
      useCrossref: document.querySelector("#useCrossref").checked,
      usePubMed: document.querySelector("#usePubMed").checked,
      allowFilenameFallback: document.querySelector("#allowFilenameFallback").checked
    }
  });
  if (result?.ok === false) {
    showValidationError(result.errors?.[0]);
    return;
  }
  clearValidationState();
  document.querySelector("#saved").textContent = "已保存";
  window.setTimeout(() => {
    document.querySelector("#saved").textContent = "";
  }, 1800);
});

void load();
