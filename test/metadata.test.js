import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  aclBibToMetadata,
  arxivXmlToMetadata,
  buildFilename,
  extractBioRxivDoi,
  extractArxivId,
  extractAclAnthologyId,
  extractDoi,
  extractNatureDoi,
  extractOxfordAcademicDoi,
  extractPii,
  extractResearchSquareId,
  extractSilverchairArticleId,
  isLikelyPaperDownload,
  metadataTextToPlainText,
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

test("buildFilename renders a custom template with fixed custom fields", () => {
  const filename = buildFilename({
    year: "2024",
    journal: "Nature Medicine",
    title: "Deep learning: a clinical study",
    doi: "10.1000/example"
  }, "download.pdf", {
    filenameTemplate: "{year}_{项目}_{title}_{doi}",
    customFields: [{ name: "项目", value: "肿瘤研究" }]
  });

  assert.equal(
    filename,
    "2024_肿瘤研究_Deep learning-a clinical study_10.1000-example.pdf"
  );
});

test("buildFilename preserves separators chosen in the template", () => {
  const filename = buildFilename({ year: "2026", title: "Paper" }, "paper.pdf", {
    filenameTemplate: "{year}--{title}",
    customFields: []
  });

  assert.equal(filename, "2026--Paper.pdf");
});

test("buildFilename keeps the original name when any referenced metadata field is missing", () => {
  const filename = buildFilename({ year: "2026" }, "paper.epub", {
    filenameTemplate: "{year}_{journal}_{title}_{doi}",
    customFields: []
  });

  assert.equal(filename, "");
});

test("buildFilename keeps the original name when every referenced metadata field is missing", () => {
  const filename = buildFilename(
    {},
    "13023_2024_Article_3065.pdf",
    DEFAULT_SETTINGS
  );

  assert.equal(filename, "");
});

test("buildFilename limits custom template output to 180 characters", () => {
  const filename = buildFilename({ title: "Long title ".repeat(40) }, "paper.pdf", {
    filenameTemplate: "ARCHIVE_{title}",
    customFields: []
  });

  assert.equal(filename.startsWith("ARCHIVE_"), true);
  assert.equal(filename.endsWith(".pdf"), true);
  assert.equal(filename.length <= 180, true);
});

test("filename settings reject template placeholders that are not defined", async () => {
  const metadataModule = await import("../src/metadata.js");
  const result = metadataModule.validateFilenameSettings?.({
    filenameTemplate: "{year}-{未定义}-{title}",
    customFields: []
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "unknown_template_field", field: "未定义" }]
  });
});

test("filename settings reject custom names reserved for built-in fields", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{year}-{title}",
    customFields: [{ name: "Year", value: "manual" }]
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "reserved_custom_field_name", field: "Year" }]
  });
});

test("filename settings reject duplicate custom field names", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{项目}-{title}",
    customFields: [
      { name: "项目", value: "肿瘤研究" },
      { name: "项目", value: "蛋白质组" }
    ]
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "duplicate_custom_field_name", field: "项目" }]
  });
});

test("filename settings reject custom field names with separators", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{year}-{title}",
    customFields: [{ name: "project-name", value: "肿瘤研究" }]
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "invalid_custom_field_name", field: "project-name" }]
  });
});

test("filename settings require a non-empty template", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({ filenameTemplate: "   ", customFields: [] });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "empty_filename_template", field: "filenameTemplate" }]
  });
});

test("filename settings require every custom field to have a name", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{year}-{title}",
    customFields: [{ name: "", value: "肿瘤研究" }]
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "invalid_custom_field_name", field: "" }]
  });
});

test("filename settings require every custom field to have a fixed value", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{项目}-{title}",
    customFields: [{ name: "项目", value: "   " }]
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "empty_custom_field_value", field: "项目" }]
  });
});

test("filename settings reject unmatched template braces", async () => {
  const { validateFilenameSettings } = await import("../src/metadata.js");
  const result = validateFilenameSettings({
    filenameTemplate: "{year}-{title",
    customFields: []
  });

  assert.deepEqual(result, {
    valid: false,
    errors: [{ code: "invalid_template_syntax", field: "filenameTemplate" }]
  });
});

test("settings updates reject invalid filename configuration before persistence", async () => {
  const metadataModule = await import("../src/metadata.js");
  const result = metadataModule.prepareSettingsUpdate?.({
    enabled: true,
    filenameTemplate: "{year}-{title}",
    customFields: []
  }, {
    filenameTemplate: "{year}-{未定义}"
  });

  assert.deepEqual(result, {
    ok: false,
    errors: [{ code: "unknown_template_field", field: "未定义" }]
  });
});

test("settings updates supply filename defaults when upgrading existing settings", async () => {
  const { prepareSettingsUpdate } = await import("../src/metadata.js");
  const result = prepareSettingsUpdate({ enabled: true }, { enabled: false });

  assert.equal(result.ok, true);
  assert.equal(result.settings.filenameTemplate, DEFAULT_SETTINGS.filenameTemplate);
  assert.deepEqual(result.settings.customFields, []);
  assert.equal(result.settings.enabled, false);
});

test("extractDoi supports DOI URLs and strips punctuation", () => {
  assert.equal(
    extractDoi("See https://doi.org/10.1038/s41586-024-01234-5."),
    "10.1038/s41586-024-01234-5"
  );
  assert.equal(
    extractDoi("https://doi.org/10.1038/s42256-026-01266-0IF: 29.8 Q1"),
    "10.1038/s42256-026-01266-0"
  );
});

test("Crossref metadata markup is converted to plain filename text", () => {
  assert.equal(
    metadataTextToPlainText("Four healthy lifestyle behaviours and adult-onset <scp>AD</scp> risk: A&nbsp;prospective Study"),
    "Four healthy lifestyle behaviours and adult-onset AD risk: A prospective Study"
  );
});

test("bioRxiv PDF URLs normalize versioned DOI suffixes", () => {
  const url = "https://www.biorxiv.org/content/10.1101/2023.12.15.571823v1.full.pdf";
  assert.equal(extractBioRxivDoi(url), "10.1101/2023.12.15.571823");
  assert.equal(isLikelyPaperDownload({ mime: "application/pdf", url }), true);
});

test("PMC article and PDF URLs expose a stable PMC identifier", async () => {
  const metadataModule = await import("../src/metadata.js");
  const extractPmcId = metadataModule.extractPmcId;

  assert.equal(
    extractPmcId?.("https://pmc.ncbi.nlm.nih.gov/articles/PMC10921669/"),
    "PMC10921669"
  );
  assert.equal(
    extractPmcId?.("https://pmc.ncbi.nlm.nih.gov/articles/PMC10921669/pdf/13023_2024_Article_3065.pdf"),
    "PMC10921669"
  );
});

test("PMC summary metadata supplies title, journal, year, and DOI", async () => {
  const metadataModule = await import("../src/metadata.js");
  const metadata = metadataModule.pmcSummaryToMetadata?.({
    uid: "10921669",
    pubdate: "2024 Mar 8",
    epubdate: "2024 Mar 8",
    source: "Orphanet J Rare Dis",
    title: "Structural brain abnormalities in Pallister-Killian syndrome: a neuroimaging study of 31 children.",
    articleids: [
      { idtype: "pmid", value: "38459574" },
      { idtype: "pmcid", value: "PMC10921669" },
      { idtype: "doi", value: "10.1186/s13023-024-03065-5" }
    ],
    fulljournalname: "Orphanet journal of rare diseases",
    sortdate: "2024/03/08 00:00"
  });

  assert.deepEqual(metadata, {
    title: "Structural brain abnormalities in Pallister-Killian syndrome: a neuroimaging study of 31 children",
    journal: "Orphanet journal of rare diseases",
    year: "2024",
    doi: "10.1186/s13023-024-03065-5"
  });
});

test("PMC summary API URL uses the numeric identifier expected by NCBI", async () => {
  const metadataModule = await import("../src/metadata.js");

  assert.equal(
    metadataModule.pmcSummaryApiUrl?.("PMC10921669"),
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=10921669&retmode=json"
  );
});

test("direct PMC PDF metadata resolves through NCBI before filename generation", async () => {
  const metadataModule = await import("../src/metadata.js");
  const requestedUrls = [];
  const item = {
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10921669/pdf/13023_2024_Article_3065.pdf",
    finalUrl: "",
    referrer: "",
    filename: "13023_2024_Article_3065.pdf"
  };
  const metadata = await metadataModule.resolvePmcMetadata?.(
    item,
    DEFAULT_SETTINGS,
    {},
    async (url) => {
      requestedUrls.push(url);
      return {
        result: {
          uids: ["10921669"],
          "10921669": {
            uid: "10921669",
            pubdate: "2024 Mar 8",
            source: "Orphanet J Rare Dis",
            title: "Structural brain abnormalities in Pallister-Killian syndrome: a neuroimaging study of 31 children.",
            articleids: [
              { idtype: "pmid", value: "38459574" },
              { idtype: "pmcid", value: "PMC10921669" },
              { idtype: "doi", value: "10.1186/s13023-024-03065-5" }
            ],
            fulljournalname: "Orphanet journal of rare diseases"
          }
        }
      };
    }
  );

  assert.deepEqual({
    requestedUrl: requestedUrls[0],
    filename: buildFilename(metadata, item.filename, DEFAULT_SETTINGS)
  }, {
    requestedUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=10921669&retmode=json",
    filename: "2024-Orphanet journal of rare diseases-Structural brain abnormalities in Pallister-Killian syndrome-a neuroimaging study of 31 children.pdf"
  });
});

test("PMC metadata lookup preserves non-empty fields captured from the article page", async () => {
  const { resolvePmcMetadata } = await import("../src/metadata.js");
  const metadata = await resolvePmcMetadata(
    {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10921669/pdf/13023_2024_Article_3065.pdf",
      filename: "13023_2024_Article_3065.pdf"
    },
    DEFAULT_SETTINGS,
    { title: "Cached canonical title", journal: "", year: "", doi: "" },
    async () => ({
      result: {
        "10921669": {
          pubdate: "2024 Mar 8",
          title: "Remote title.",
          articleids: [{ idtype: "doi", value: "10.1186/s13023-024-03065-5" }],
          fulljournalname: "Orphanet journal of rare diseases"
        }
      }
    })
  );

  assert.deepEqual(metadata, {
    title: "Cached canonical title",
    journal: "Orphanet journal of rare diseases",
    year: "2024",
    doi: "10.1186/s13023-024-03065-5"
  });
});

test("PMC metadata lookup fills a missing DOI for DOI-based templates", async () => {
  const { resolvePmcMetadata } = await import("../src/metadata.js");
  const metadata = await resolvePmcMetadata(
    {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10921669/pdf/13023_2024_Article_3065.pdf",
      filename: "13023_2024_Article_3065.pdf"
    },
    DEFAULT_SETTINGS,
    {
      title: "Cached title",
      journal: "Cached journal",
      year: "2024",
      doi: ""
    },
    async () => ({
      result: {
        "10921669": {
          pubdate: "2024 Mar 8",
          title: "Remote title.",
          articleids: [{ idtype: "doi", value: "10.1186/s13023-024-03065-5" }],
          fulljournalname: "Remote journal"
        }
      }
    })
  );

  assert.equal(metadata.doi, "10.1186/s13023-024-03065-5");
});

test("arXiv PDF URLs expose a stable identifier and metadata parser", () => {
  assert.equal(extractArxivId("2603.25097v1.pdf"), "2603.25097");
  assert.equal(
    extractArxivId("https://arxiv.org/pdf/2603.25097v1"),
    "2603.25097"
  );
  assert.equal(isLikelyPaperDownload({
    mime: "application/octet-stream",
    url: "https://arxiv.org/pdf/2603.25097v1",
    filename: "2603.25097v1.pdf"
  }), true);

  const metadata = arxivXmlToMetadata(`
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>ElephantBroker: A Knowledge-Grounded Cognitive Runtime for Trustworthy AI Agents</title>
        <published>2026-03-26T07:03:12Z</published>
        <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">10.1234/example</arxiv:doi>
      </entry>
    </feed>
  `);
  assert.deepEqual(metadata, {
    title: "ElephantBroker: A Knowledge-Grounded Cognitive Runtime for Trustworthy AI Agents",
    journal: "arXiv",
    year: "2026",
    doi: "10.1234/example"
  });
});

test("ACL Anthology PDF URLs expose a stable identifier and BibTeX metadata", () => {
  assert.equal(
    extractAclAnthologyId("https://aclanthology.org/2026.acl-long.981.pdf"),
    "2026.acl-long.981"
  );
  assert.equal(extractAclAnthologyId("2026.acl-long.981.pdf"), "2026.acl-long.981");
  assert.equal(isLikelyPaperDownload({
    mime: "application/pdf",
    url: "https://aclanthology.org/2026.acl-long.981.pdf",
    filename: "2026.acl-long.981.pdf"
  }), true);

  const metadata = aclBibToMetadata(`
    @inproceedings{yu-etal-2026-agentic,
      title = "Agentic Memory: Learning Unified Long-Term and Short-Term Memory Management for Large Language Model Agents",
      booktitle = "Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers)",
      year = "2026",
      doi = "10.18653/v1/2026.acl-long.981"
    }
  `);
  assert.deepEqual(metadata, {
    title: "Agentic Memory: Learning Unified Long-Term and Short-Term Memory Management for Large Language Model Agents",
    journal: "Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers)",
    year: "2026",
    doi: "10.18653/v1/2026.acl-long.981"
  });
});

test("extractPii supports encoded Cell PDF URLs", () => {
  assert.equal(
    extractPii("https://www.cell.com/action/showPdf?pii=S2211-1247%2826%2900720-5"),
    "S2211-1247(26)00720-5"
  );
  assert.equal(
    extractPii("https://www.cell.com/action/showPdf?pii=S0966-842X%2826%2900088-0"),
    "S0966-842X(26)00088-0"
  );
  assert.equal(isLikelyPaperDownload({
    mime: "application/octet-stream",
    url: "https://www.cell.com/action/showPdf?pii=S0966-842X%2826%2900088-0"
  }), true);
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

test("Nature article PDF URLs expose the 10.1038 DOI fallback", () => {
  assert.equal(
    extractNatureDoi("https://www.nature.com/articles/s41592-026-03085-y.pdf"),
    "10.1038/s41592-026-03085-y"
  );
  assert.equal(
    extractNatureDoi("https://www.nature.com/articles/s41586-026-10647-9.pdf"),
    "10.1038/s41586-026-10647-9"
  );
  assert.equal(
    extractNatureDoi("https://www.nature.com/articles/d41586-026-01739-7.pdf"),
    "10.1038/d41586-026-01739-7"
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
