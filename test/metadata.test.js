import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFilename,
  extractDoi,
  isLikelyPaperDownload,
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

test("paper detection accepts PDF downloads and rejects HTML pages", () => {
  assert.equal(isLikelyPaperDownload({ mime: "application/pdf", url: "https://example.org/file" }), true);
  assert.equal(isLikelyPaperDownload({ mime: "text/html", url: "https://example.org/article" }), false);
});

test("title similarity gives a strong match to near-identical titles", () => {
  assert.equal(titleSimilarity(
    "Deep learning for clinical outcome prediction",
    "Deep learning for clinical outcome prediction in hospitals"
  ) >= 0.72, true);
});
