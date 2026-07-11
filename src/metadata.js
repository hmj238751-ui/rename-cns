export const DEFAULT_SETTINGS = {
  enabled: true,
  useCrossref: true,
  allowFilenameFallback: false
};

const DOI_PATTERN = /\b10\.\d{4,9}\/[\-._;()/:A-Z0-9]+\b/i;
const MAX_FILENAME_LENGTH = 180;

export function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeYear(value) {
  const match = cleanText(value).match(/(?:19|20)\d{2}/);
  return match ? match[0] : "";
}

export function extractDoi(value) {
  const match = cleanText(value).match(DOI_PATTERN);
  if (!match) return "";
  return match[0].replace(/[.,;:!?\]})>]+$/g, "");
}

export function normalizeComparableUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return cleanText(value).replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

export function getFileExtension(filename, url = "") {
  const source = cleanText(filename) || url;
  const basename = source.split(/[\\/]/).pop() || "";
  const match = basename.match(/\.([a-z0-9]{2,8})(?:$|[?#])/i);
  return match ? `.${match[1].toLowerCase()}` : ".pdf";
}

export function isLikelyPaperDownload(item) {
  const source = `${item?.mime || ""} ${item?.url || ""} ${item?.filename || ""}`.toLowerCase();
  return /application\/(pdf|epub\+zip|x-djvu|x-caj)/i.test(source)
    || /\.(pdf|epub|djvu|caj)(?:$|[?#\s])/i.test(source);
}

export function sanitizeFilenamePart(value, fallback) {
  const result = cleanText(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "");
  return result || fallback;
}

export function buildFilename(metadata, originalFilename = "") {
  const title = sanitizeFilenamePart(metadata?.title, "");
  if (!title) return "";

  const year = sanitizeFilenamePart(normalizeYear(metadata?.year), "UnknownYear");
  const journal = sanitizeFilenamePart(metadata?.journal, "UnknownJournal");
  const extension = getFileExtension(originalFilename, metadata?.pdfUrl || "");
  const prefix = `${year}-${journal}-`;
  const availableTitleLength = Math.max(40, MAX_FILENAME_LENGTH - prefix.length - extension.length);
  const shortenedTitle = title.slice(0, availableTitleLength).replace(/[.\s-]+$/g, "");
  return `${prefix}${shortenedTitle}${extension}`;
}

export function mergeMetadata(primary = {}, secondary = {}) {
  const merged = { ...secondary };
  for (const [key, value] of Object.entries(primary)) {
    if (cleanText(value)) merged[key] = value;
  }
  return merged;
}

export function titleSimilarity(left, right) {
  const tokenize = (value) => new Set(
    cleanText(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter((token) => token.length > 1)
  );
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / new Set([...a, ...b]).size;
}

export function filenameToTitle(filename) {
  const basename = cleanText(filename).split(/[\\/]/).pop() || "";
  const withoutExtension = basename.replace(/\.[a-z0-9]{2,8}$/i, "");
  const withoutDoi = withoutExtension.replace(DOI_PATTERN, " ");
  return cleanText(withoutDoi.replace(/[._]+/g, " ").replace(/\s+/g, " "));
}
