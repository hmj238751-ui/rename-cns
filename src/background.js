import {
  DEFAULT_SETTINGS,
  buildFilename,
  extractDoi,
  extractPii,
  extractResearchSquareId,
  filenameToTitle,
  isLikelyPaperDownload,
  mergeMetadata,
  normalizeComparableUrl,
  researchSquareDoi,
  titleSimilarity
} from "./metadata.js";

const SETTINGS_KEY = "settings";
const PAGE_METADATA_KEY = "pageMetadataCache";
const HISTORY_KEY = "renameHistory";
const MAX_PAGE_RECORDS = 100;
const MAX_HISTORY_RECORDS = 30;

function sessionStorageArea() {
  return chrome.storage.session || chrome.storage.local;
}

async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

async function saveSettings(partial) {
  const settings = { ...(await getSettings()), ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  await updateBadge(settings);
  return settings;
}

async function updateBadge(settings) {
  settings = settings || await getSettings();
  if (!chrome.action?.setBadgeText) return;
  await chrome.action.setBadgeText({ text: settings.enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: settings.enabled ? "#2f7d5b" : "#8c96a3"
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(SETTINGS_KEY);
  if (!current[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  }
  await updateBadge();
});

chrome.runtime.onStartup?.addListener(() => {
  void updateBadge();
});

async function storePageMetadata(record) {
  if (!record?.pageUrl || !record.metadata) return;
  const area = sessionStorageArea();
  const result = await area.get(PAGE_METADATA_KEY);
  const records = Array.isArray(result[PAGE_METADATA_KEY]) ? result[PAGE_METADATA_KEY] : [];
  const normalizedPageUrl = normalizeComparableUrl(record.pageUrl);
  const normalizedPdfUrl = normalizeComparableUrl(record.pdfUrl);
  const existingIndex = records.findIndex((item) => {
    return normalizeComparableUrl(item.pageUrl) === normalizedPageUrl
      || (normalizedPdfUrl && normalizeComparableUrl(item.pdfUrl) === normalizedPdfUrl);
  });

  const next = {
    pageUrl: record.pageUrl,
    pdfUrl: record.pdfUrl || "",
    metadata: record.metadata,
    updatedAt: Date.now()
  };
  if (existingIndex >= 0) records.splice(existingIndex, 1);
  records.unshift(next);
  await area.set({ [PAGE_METADATA_KEY]: records.slice(0, MAX_PAGE_RECORDS) });
}

async function readPageMetadata(item) {
  const area = sessionStorageArea();
  const result = await area.get(PAGE_METADATA_KEY);
  const records = Array.isArray(result[PAGE_METADATA_KEY]) ? result[PAGE_METADATA_KEY] : [];
  const referrer = normalizeComparableUrl(item.referrer);
  const downloadUrl = normalizeComparableUrl(item.url);
  const finalUrl = normalizeComparableUrl(item.finalUrl);
  const researchSquareId = extractResearchSquareId([
    item.url,
    item.finalUrl,
    item.referrer
  ].join(" "));

  const exact = records.find((record) => {
    const pageUrl = normalizeComparableUrl(record.pageUrl);
    const pdfUrl = normalizeComparableUrl(record.pdfUrl);
    return (referrer && (referrer === pageUrl || referrer === pdfUrl))
      || (downloadUrl && (downloadUrl === pageUrl || downloadUrl === pdfUrl))
      || (finalUrl && (finalUrl === pageUrl || finalUrl === pdfUrl))
      || (researchSquareId && researchSquareId === extractResearchSquareId(`${record.pageUrl} ${record.pdfUrl}`));
  });
  return exact?.metadata || {};
}

async function recordRename(item, filename, metadata) {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  history.unshift({
    id: item.id,
    originalFilename: item.filename || "",
    renamedFilename: filename,
    title: metadata.title || "",
    journal: metadata.journal || "",
    year: metadata.year || "",
    time: Date.now()
  });
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, MAX_HISTORY_RECORDS) });
}

async function fetchJson(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function crossrefMessageToMetadata(message) {
  if (!message) return {};
  const dateParts = message["published-print"]?.["date-parts"]?.[0]
    || message["published-online"]?.["date-parts"]?.[0]
    || message.issued?.["date-parts"]?.[0]
    || [];
  return {
    title: message.title?.[0] || "",
    journal: message["container-title"]?.[0] || "",
    year: dateParts[0] ? String(dateParts[0]) : "",
    doi: message.DOI || "",
    pdfUrl: message.link?.find((link) => link["content-type"] === "application/pdf")?.URL || ""
  };
}

async function fetchCrossrefByDoi(doi) {
  const encodedDoi = encodeURIComponent(doi);
  const response = await fetchJson(`https://api.crossref.org/works/${encodedDoi}`);
  return crossrefMessageToMetadata(response.message);
}

async function fetchCrossrefByTitle(title) {
  const query = encodeURIComponent(title);
  const response = await fetchJson(`https://api.crossref.org/works?query.bibliographic=${query}&rows=3`);
  const candidates = response.message?.items || [];
  const best = candidates
    .map((item) => ({ item, score: titleSimilarity(title, item.title?.[0] || "") }))
    .sort((left, right) => right.score - left.score)[0];
  return best && best.score >= 0.72 ? crossrefMessageToMetadata(best.item) : {};
}

async function fetchPubmedByPii(pii) {
  const term = encodeURIComponent(`"${pii}"[All Fields]`);
  const search = await fetchJson(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmode=json&retmax=1`
  );
  const pmid = search.esearchresult?.idlist?.[0];
  if (!pmid) return {};

  const summary = await fetchJson(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=json`
  );
  const record = summary.result?.[pmid];
  if (!record) return {};
  const doi = record.articleids?.find((item) => item.idtype === "doi")?.value || "";
  return {
    title: record.title || "",
    journal: record.fulljournalname || record.source || "",
    year: record.pubdate?.match(/(?:19|20)\d{2}/)?.[0] || "",
    doi
  };
}

async function resolveMetadata(item, settings) {
  let metadata = await readPageMetadata(item);
  const sourceUrls = [
    item.url,
    item.finalUrl,
    item.referrer,
    item.filename
  ].join(" ");
  const discoveredResearchSquareDoi = researchSquareDoi(sourceUrls);
  const discoveredDoi = extractDoi([
    metadata.doi,
    item.url,
    item.finalUrl,
    item.referrer,
    item.filename
  ].join(" ")) || discoveredResearchSquareDoi;
  const discoveredPii = extractPii([
    item.url,
    item.finalUrl,
    item.filename
  ].join(" "));
  if (!metadata.journal && extractResearchSquareId(sourceUrls)) {
    metadata = { ...metadata, journal: "Research Square" };
  }
  if (discoveredDoi && !metadata.doi) metadata = { ...metadata, doi: discoveredDoi };

  if (settings.useCrossref) {
    try {
      const remote = discoveredDoi
        ? await fetchCrossrefByDoi(discoveredDoi)
        : metadata.title && (!metadata.year || !metadata.journal)
          ? await fetchCrossrefByTitle(metadata.title)
          : {};
      metadata = mergeMetadata(metadata, remote);
    } catch (error) {
      console.warn("Crossref metadata lookup failed", error);
    }
  }

  if (!metadata.title && discoveredPii && settings.usePubMed) {
    try {
      metadata = mergeMetadata(metadata, await fetchPubmedByPii(discoveredPii));
    } catch (error) {
      console.warn("PubMed PII lookup failed", error);
    }
  }

  if (!metadata.title && settings.allowFilenameFallback) {
    metadata = { ...metadata, title: filenameToTitle(item.filename || item.url) };
  }
  return metadata;
}

async function handleDeterminingFilename(item, suggest) {
  try {
    const settings = await getSettings();
    if (!settings.enabled || !isLikelyPaperDownload(item)) {
      suggest();
      return;
    }

    const metadata = await resolveMetadata(item, settings);
    const filename = buildFilename(metadata, item.filename || item.url);
    if (!filename) {
      suggest();
      return;
    }

    suggest({ filename, conflictAction: "uniquify" });
    await recordRename(item, filename, metadata);
  } catch (error) {
    console.warn("Paper rename failed", error);
    suggest();
  }
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  void handleDeterminingFilename(item, suggest);
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PAGE_METADATA") {
    void storePageMetadata({
      pageUrl: message.pageUrl || sender.tab?.url,
      pdfUrl: message.pdfUrl || "",
      metadata: message.metadata || {}
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "GET_STATUS") {
    void Promise.all([
      getSettings(),
      chrome.storage.local.get(HISTORY_KEY)
    ]).then(([settings, historyResult]) => sendResponse({
      settings,
      history: Array.isArray(historyResult[HISTORY_KEY]) ? historyResult[HISTORY_KEY] : []
    }));
    return true;
  }

  if (message?.type === "SET_SETTINGS") {
    void saveSettings(message.settings || {}).then((settings) => sendResponse({ settings }));
    return true;
  }

  if (message?.type === "CLEAR_HISTORY") {
    void chrome.storage.local.set({ [HISTORY_KEY]: [] }).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
