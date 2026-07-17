import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFilename,
  extractBioRxivDoi,
  extractDoi,
  extractOxfordAcademicDoi,
  extractPii,
  extractResearchSquareId,
  extractSilverchairArticleId,
  isLikelyPaperDownload,
  normalizeComparableUrl,
  researchSquareDoi,
  titleSimilarity
} from "../src/metadata.js";

test("buildFilename uses the requested ordering and keeps the extension", () => {
  const filename = buildFilename({
    year: "2024-06-01",
    journal: "Nature Medicine",
    title: "Deep learning: a clinical study"
  }, "download.pdf");

  assert.equal(filename, "2024-Nature Medicine-Deep learning-a clinical study.pdf");
});

test("buildFilename removes unsupported filename characters and limits length", () => {
  const filename = buildFilename({
    year: "2023",
    journal: "Cell/Host-Microbe",
    title: "A very long title ".repeat(40)
  }, "paper.pdf");

  assert.equal(filename.endsWith(".pdf"), true);
  assert.equal(filename.includes("/"), false);
  assert.equal(filename.length <= 180, true);
});

test("extractDoi supports DOI URLs and strips punctuation", () => {
  assert.equal(
    extractDoi("See https://doi.org/10.1038/s41586-024-01234-5."),
    "10.1038/s41586-024-01234-5"
  );
});

test("bioRxiv PDF URLs normalize versioned DOI suffixes", () => {
  const url = "https://www.biorxiv.org/content/10.1101/2023.12.15.571823v1.full.pdf";
  assert.equal(extractBioRxivDoi(url), "10.1101/2023.12.15.571823");
  assert.equal(isLikelyPaperDownload({ mime: "application/pdf", url }), true);
});

test("extractPii supports encoded Cell PDF URLs", () => {
  assert.equal(
    extractPii("https://www.cell.com/action/showPdf?pii=S2211-1247%2826%2900720-5"),
    "S2211-1247(26)00720-5"
  );
});

test("Research Square URLs expose a stable article ID and DOI", () => {
  const urls = [
    "https://www.researchsquare.com/article/rs-9329453/v1.pdf?c=1780646183000",
    "https://assets-eu.researchsquare.com/files/rs-9329453/v1_covered_083b2f0f-35c6-4346-a521-83358bf532c4.pdf?c=1780631783",
    "https://assets-eu.researchsquare.com/files/rs-9635406/v1/04dd0640-2cb6-4875-9c4a-ce63dc9783c8.pdf?c=1783609075"
  ];
  assert.equal(extractResearchSquareId(urls[0]), "rs-9329453");
  assert.equal(extractResearchSquareId(urls[1]), "rs-9329453");
  assert.equal(extractResearchSquareId(urls[2]), "rs-9635406");
  assert.equal(researchSquareDoi(urls[0]), "10.21203/rs.3.rs-9329453/v1");
  assert.equal(researchSquareDoi(urls[1]), "10.21203/rs.3.rs-9329453/v1");
  assert.equal(researchSquareDoi(urls[2]), "10.21203/rs.3.rs-9635406/v1");
});

test("Silverchair article and watermark PDF URLs expose a stable article ID", () => {
  const articleUrl = "https://academic.oup.com/ve/article/11/1/veaf045/8176603";
  const pdfUrl = "https://watermark02.silverchair.com/veaf045.pdf?token=temporary-token";
  assert.equal(extractSilverchairArticleId(articleUrl), "veaf045");
  assert.equal(extractSilverchairArticleId(pdfUrl), "veaf045");
  assert.equal(isLikelyPaperDownload({ mime: "application/octet-stream", url: pdfUrl }), true);
});

test("Oxford Academic article URLs expose the Crossref DOI fallback", () => {
  assert.equal(
    extractOxfordAcademicDoi("https://academic.oup.com/ve/article/11/1/veae114/7931863"),
    "10.1093/ve/veae114"
  );
});

test("URL normalization preserves meaningful PII query parameters", () => {
  assert.equal(
    normalizeComparableUrl("https://www.cell.com/action/showPdf?pii=S2211-1247%2826%2900720-5"),
    "https://www.cell.com/action/showpdf?pii=s2211-1247%2826%2900720-5"
  );
});

test("paper detection accepts PDF downloads and rejects HTML pages", () => {
  assert.equal(isLikelyPaperDownload({ mime: "application/pdf", url: "https://example.org/file" }), true);
  assert.equal(isLikelyPaperDownload({ mime: "text/html", url: "https://example.org/article" }), false);
  assert.equal(isLikelyPaperDownload({
    mime: "application/octet-stream",
    url: "https://www.cell.com/action/showPdf?pii=S2211-1247%2826%2900720-5"
  }), true);
  assert.equal(isLikelyPaperDownload({
    mime: "application/octet-stream",
    url: "https://www.researchsquare.com/article/rs-9329453/v1.pdf?c=1780646183000"
  }), true);
});

test("title similarity gives a strong match to near-identical titles", () => {
  assert.equal(titleSimilarity(
    "Deep learning for clinical outcome prediction",
    "Deep learning for clinical outcome prediction in hospitals"
  ) >= 0.72, true);
});
