# 论文文献智能改名

一个 Chrome/Edge Manifest V3 浏览器扩展，在论文下载开始时，将文件命名为：

```text
年份-发表期刊-文献名称.pdf
```

例如：

```text
2024-Nature Medicine-Deep learning for clinical outcome prediction.pdf
```

## 当前工作方式

1. 扩展在论文网页中读取常见的公开元数据：`citation_title`、`citation_journal_title`、`citation_publication_date`、`citation_doi`、JSON-LD 等。
2. 用户点击 PDF 下载链接时，扩展把该文章页和 PDF 地址建立短期关联。
3. 下载事件触发时，扩展在浏览器写入文件名前调用 `downloads.onDeterminingFilename`。
4. 如果识别到 DOI，默认尝试从 Crossref 补全标题、期刊和年份。
5. 文件名会清理操作系统不允许的字符，并在重名时使用浏览器的 `uniquify` 策略。

## 安装开发版

1. 打开 Chrome 或 Edge 的扩展管理页：`chrome://extensions` 或 `edge://extensions`。
2. 打开“开发者模式”。
3. 选择“加载已解压的扩展”，选择本项目根目录。
4. 打开一个论文页面，点击 PDF 下载链接，然后在下载目录检查文件名。

## 已知边界

- 浏览器扩展 API 没有通用的“下载完成后重命名任意文件”能力，所以本项目选择在落盘前通过 `onDeterminingFilename` 改名；已经存在的旧文件不会被自动处理。
- 如果出版社页面没有提供论文元数据，且下载 URL/文件名中也没有 DOI，扩展会保持原文件名，避免把错误信息写入文件名。
- 目前 Crossref 是唯一的远程补全源，后续可以增加 PubMed、Europe PMC、OpenAlex 或出版社专属解析器。

## 目录

- `manifest.json`：扩展配置。
- `src/content.js`：从论文网页采集元数据。
- `src/background.js`：监听下载、匹配元数据、调用 Crossref 并建议文件名。
- `src/metadata.js`：与浏览器 API 无关的命名和文本处理函数。
- `src/popup.*`：状态与最近改名记录。
- `src/options.*`：补全策略设置。
