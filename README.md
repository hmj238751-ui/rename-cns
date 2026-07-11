# 论文文献智能改名 / Paper Auto Renamer

当前版本：1.02（上一版 1.01，初始版本 1.00）<br>
Current version: 1.02 (previously 1.01; initial release 1.00)

一个 Chrome/Edge Manifest V3 浏览器扩展，在论文下载开始时，将文件命名为：<br>
A Chrome/Edge Manifest V3 extension that names downloaded papers as:

```text
年份-发表期刊-文献名称.pdf
YYYY-Journal-Title.pdf
```

例如 / Example:

```text
2024-Nature Medicine-Deep learning for clinical outcome prediction.pdf
```

## 功能 / Features

- 监听浏览器下载，并在文件落盘前建议新文件名。<br>
  Listens for browser downloads and suggests a filename before the file is written.
- 读取 `citation_*`、JSON-LD 和页面公开元数据。<br>
  Reads public `citation_*`, JSON-LD, and page metadata.
- 通过 Crossref 补全 DOI 对应的标题、期刊和年份。<br>
  Uses Crossref to complete title, journal, and year metadata for DOI links.
- 支持 Cell 的 `showPdf?pii=...` 和 Research Square 的 `assets-*.researchsquare.com/files/...` 下载地址。<br>
  Supports Cell `showPdf?pii=...` and Research Square `assets-*.researchsquare.com/files/...` download URLs.
- 使用 PubMed 解析 Cell PII，并使用文章 ID/版本号匹配 Research Square 页面。<br>
  Uses PubMed for Cell PII and matches Research Square pages by article ID and version.
- 自动清理操作系统不允许的字符，并处理重名文件。<br>
  Removes filesystem-invalid characters and handles filename conflicts.

## 安装开发版 / Development installation

1. 打开 Chrome 或 Edge 的扩展管理页：`chrome://extensions` 或 `edge://extensions`。<br>
   Open `chrome://extensions` or `edge://extensions`.
2. 打开“开发者模式”。<br>
   Enable Developer mode.
3. 选择“加载已解压的扩展”，选择本项目根目录。<br>
   Choose “Load unpacked” and select the project root.
4. 打开论文页面，刷新页面后点击 PDF 下载链接。<br>
   Open a paper page, refresh it, and click its PDF download link.

## 元数据来源 / Metadata sources

1. 优先读取论文网页公开元数据。<br>
   Public metadata on the paper page is preferred.
2. 有 DOI 时查询 Crossref。<br>
   Crossref is queried when a DOI is available.
3. Cell PII 查询 PubMed；Research Square 版本 DOI 查询 Crossref。<br>
   Cell PII is resolved through PubMed; Research Square version DOIs are resolved through Crossref.

## 隐私说明 / Privacy

扩展只为完成文件命名而读取当前页面的公开论文元数据、下载 URL 和下载信息；设置与改名记录保存在本地。DOI/PII 可能被发送到 Crossref 或 PubMed 进行元数据查询，不会上传论文正文或账号密码。<br>
The extension reads public paper metadata, download URLs, and download information only to provide its renaming feature. Settings and rename history are stored locally. DOI/PII may be sent to Crossref or PubMed for metadata lookup; paper contents and account credentials are not uploaded.

## 已知边界 / Known limitations

- 浏览器扩展 API 没有通用的“下载完成后重命名任意文件”能力，因此扩展在落盘前通过 `onDeterminingFilename` 建议文件名。<br>
  Browser extensions cannot generally rename arbitrary files after download, so this project suggests the name before the file is written.
- 如果页面和下载地址都没有可用标题、DOI 或文章 ID，扩展会保留原文件名。<br>
  If neither the page nor the download URL provides a usable title, DOI, or article ID, the original filename is kept.

## 开发检查 / Development checks

```bash
npm run check
npm test
```

GitHub Actions 会在 push 和 pull request 时自动运行这些检查。<br>
GitHub Actions runs these checks on every push and pull request.

## 项目结构 / Project structure

- `manifest.json`：扩展配置 / extension manifest
- `src/content.js`：页面元数据采集 / page metadata collection
- `src/background.js`：下载监听与重命名 / download handling and renaming
- `src/metadata.js`：元数据与文件名处理 / metadata and filename utilities
- `src/popup.*`：状态与历史记录 / status and history UI
- `src/options.*`：补全策略设置 / metadata lookup settings
- `test/`：自动化测试 / automated tests
