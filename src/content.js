(function () {
  const DOI_PATTERN = /\b10\.\d{4,9}\/[\-._;()/:A-Z0-9]+\b/i;

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function firstMeta(names) {
    for (const name of names) {
      const selector = `meta[name="${CSS.escape(name)}"], meta[property="${CSS.escape(name)}"]`;
      const element = document.querySelector(selector);
      const value = clean(element?.content);
      if (value) return value;
    }
    return "";
  }

  function flattenJsonLd(value, result = []) {
    if (Array.isArray(value)) {
      value.forEach((item) => flattenJsonLd(item, result));
    } else if (value && typeof value === "object") {
      result.push(value);
      Object.values(value).forEach((item) => {
        if (item && typeof item === "object") flattenJsonLd(item, result);
      });
    }
    return result;
  }

  function jsonLdArticle() {
    const nodes = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        flattenJsonLd(JSON.parse(script.textContent), nodes);
      } catch {
        // Some publishers put invalid JSON-LD on the page; other metadata is still usable.
      }
    });

    const articleTypes = new Set([
      "article",
      "scholarlyarticle",
      "medicalscholarlyarticle",
      "newsarticle"
    ]);
    return nodes.find((node) => {
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      return types.some((type) => articleTypes.has(String(type || "").toLowerCase()));
    }) || {};
  }

  function jsonLdText(article, key) {
    const value = article[key];
    if (typeof value === "string") return clean(value);
    if (value && typeof value === "object") return clean(value.name || value.url);
    return "";
  }

  function extractMetadata() {
    const article = jsonLdArticle();
    const articleSection = article.isPartOf || article.periodical || {};
    const title = firstMeta(["citation_title", "dc.title", "dcterms.title"])
      || jsonLdText(article, "headline")
      || jsonLdText(article, "name")
      || clean(document.querySelector("article h1, main h1, h1")?.textContent)
      || firstMeta(["og:title", "twitter:title"])
      || clean(document.title);
    const journal = firstMeta([
      "citation_journal_title",
      "prism.publicationName",
      "citation_journal_abbrev",
      "dc.source"
    ])
      || jsonLdText(articleSection, "name")
      || jsonLdText(article.publisher, "name")
      || (/researchsquare\.com$/i.test(location.hostname) ? "Research Square" : "");
    const date = firstMeta([
      "citation_publication_date",
      "citation_date",
      "citation_year",
      "prism.coverDate",
      "article:published_time",
      "dc.date",
      "dcterms.issued"
    ]) || jsonLdText(article, "datePublished") || jsonLdText(article, "dateCreated");
    const doiSource = firstMeta(["citation_doi", "dc.identifier", "dcterms.identifier"])
      || jsonLdText(article, "identifier")
      || document.querySelector('a[href*="doi.org"], link[href*="doi.org"]')?.href
      || location.href;
    const doi = doiSource.match(DOI_PATTERN)?.[0]?.replace(/[.,;:!?\]})>]+$/g, "") || "";
    const pdfUrl = firstMeta(["citation_pdf_url"])
      || document.querySelector('link[type="application/pdf"]')?.href
      || "";
    const year = date.match(/(?:19|20)\d{2}/)?.[0] || "";

    return {
      title,
      journal,
      year,
      doi,
      pdfUrl
    };
  }

  function sendMetadata(pdfUrl = "") {
    const metadata = extractMetadata();
    chrome.runtime.sendMessage({
      type: "PAGE_METADATA",
      pageUrl: location.href,
      pdfUrl: pdfUrl || metadata.pdfUrl,
      metadata
    }).catch(() => {
      // The extension can be reloaded while a page is open.
    });
  }

  sendMetadata();
  window.setTimeout(() => sendMetadata(), 1500);

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = link.href || "";
    if (/\.pdf(?:$|[?#])/i.test(href) || /application\/pdf/i.test(link.type || "")) {
      sendMetadata(href);
    }
  }, true);
})();
