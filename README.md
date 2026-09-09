# 论文文献智能改名

版本：1.12

这是一个适用于 Chrome 和 Edge 的浏览器扩展。下载论文时，它会自动将文件命名为：

```text
年份-发表期刊-文献名称.pdf
```

示例：

```text
2023-bioRxiv-Structure-conditioned masked language models for protein sequence design generalize beyond the native sequence space.pdf
```

## 主要功能

- 读取论文网页公开的标题、期刊、年份、DOI 等信息，并且监听论文下载，并在文件保存前建议新文件名。
- 通过 Crossref 和 PubMed 补全文献元数据。
- 支持 Cell、Research Square、bioRxiv、Silverchair 水印 PDF 等常见论文下载地址。
- 对 Oxford Academic 文章页提供 DOI 后备解析，避免页面元数据未加载时无法改名。
- 支持 Nature 文章编号 PDF 地址，并自动补全对应 DOI。
- 支持 Cell 中含字母的 PII 编号，以及 Nature 文章编号末尾为字母的格式。
- 修复部分 Cell 和 Nature PDF 地址无法自动改名的问题。
- 支持 arXiv 的 `YYMM.NNNNNv1.pdf` 版本化 PDF 地址，并通过 arXiv API 补全文献标题和年份。
- arXiv 预印本没有期刊信息时，文件名中的期刊字段使用 `arXiv`。
- 支持 ACL Anthology 的 `2026.acl-long.981.pdf` 等会议论文 PDF 地址，并通过 ACL Anthology BibTeX 元数据补全标题、年份和 DOI。
- 支持自定义文件名模板，可自由组合年份、期刊、标题和 DOI。
- 支持添加全局固定的自定义字段，例如项目名、课题组或归档标签。
- 支持 PMC 论文直接 PDF 地址，通过 PMC ID 从 NCBI 补全标题、期刊、年份和 DOI。
- 当模板引用的任一论文元数据缺失时，保留原文件名，不再生成带 `Unknown` 的文件名。
- 支持从科研通页面提取 DOI 并关联实际下载地址，自动剔除紧邻 DOI 的 `IF` 等期刊指标文本。
- 元数据接口超时延长至 8 秒，并对临时错误自动重试一次；模板所需字段仍缺失时保留原文件名，不再写入 `Unknown`。


## 安装

### 方法一：下载压缩包安装（推荐）

1. 点击绿色的 **Code** 按钮，再点击 **Download ZIP**。
2. 打开电脑的“下载”文件夹，找到 `rename-cns-main.zip`。
3.  解压出 `rename-cns-main` 文件夹
4. 在 Chrome 地址栏打开：

   ```text
   chrome://extensions
   ```

5. 打开右上角的“开发者模式”。
6. 点击“加载已解压的扩展”。
7. 选择刚才解压并保存好的 `rename-cns-main` 文件夹。
8. 点击 “重新加载”

### 方法二：使用 Git 克隆安装

如果电脑已经安装 Git，可以在终端执行：

```bash
git clone https://github.com/hmj238751-ui/rename-cns.git ~/Documents/rename-cns
```

这条命令会把项目下载到当前用户的“文档”文件夹。然后在 `chrome://extensions` 页面选择：

```text
~/Documents/rename-cns
```

Windows 用户可以将仓库克隆到“文档”文件夹，再在“加载已解压的扩展”时选择该文件夹。

## 使用方法

1. 安装扩展后，打开一个论文网页。
2. 刷新论文网页，让扩展读取页面信息。
3. 点击论文的 PDF 下载按钮。
4. 下载完成后，检查文件名是否已经变成“年份-期刊-标题”。

如果更新了扩展代码，请先在 `chrome://extensions` 页面点击扩展的“重新加载”，再刷新论文网页。

### 自定义文件名

1. 在扩展弹窗中点击“更多设置”。
2. 在“文件名模板”中组合 `{year}`、`{journal}`、`{title}` 和 `{doi}`。
3. 如需固定内容，点击“添加字段”，填写字段名和固定值。
4. 在模板中用大括号引用该字段，确认预览后保存。

例如，新增自定义字段 `项目 = 肿瘤研究`，并将模板设为：

```text
{year}_{项目}_{title}
```

生成的文件名形如：

```text
2026_肿瘤研究_Example paper title.pdf
```

如果模板引用的任一内置字段缺少数据，扩展会保留浏览器提供的原文件名，避免生成带 `Unknown` 的文件名。模板中存在未定义字段时，设置页会提示并阻止保存。

## 支持的元数据来源

- 论文网页中的公开元数据。
- Crossref DOI 元数据。
- PubMed 元数据。
- PMC ID 和 NCBI PMC 元数据。
- Cell 的 PII 下载地址。
- Research Square 的文章地址和资产服务器地址。
- bioRxiv 的版本化 PDF 地址。
- arXiv 的版本化 PDF 地址和 arXiv API 元数据。
- ACL Anthology 的会议论文 PDF 地址和 BibTeX 元数据。
- Silverchair 的带临时 token 水印 PDF 地址。

## 隐私说明

扩展只读取论文网页公开的元数据、下载地址和下载信息，用于完成文件命名功能。

- 设置和改名记录保存在本地。
- DOI、PII、PMC ID、arXiv ID 或 ACL Anthology ID 可能会发送到 Crossref、NCBI、arXiv 或 ACL Anthology 查询论文元数据。
- 不会上传论文正文。
- 不会读取或上传账号密码。

## 常见问题

### 为什么下载后没有改名？

请依次检查：

1. 扩展是否处于启用状态。
2. 安装或更新扩展后，论文网页是否重新刷新过。
3. 下载的是否确实是论文文件，而不是网页或验证页面。
4. 网页或下载地址中是否包含标题、DOI 或文章编号。

### 可以处理已经下载的旧文件吗？

不能。浏览器扩展通常只能在文件保存前建议文件名，不能直接修改任意已经存在的本地文件。

## 开发检查

在项目目录中执行：

```bash
npm run check
npm test
```

GitHub Actions 会在每次提交代码或创建 Pull Request 时自动运行检查。

## 项目结构

- `manifest.json`：扩展配置文件。
- `src/content.js`：采集论文网页信息。
- `src/background.js`：监听下载并生成文件名。
- `src/metadata.js`：处理 DOI、文章编号和文件名。
- `src/popup.*`：显示扩展状态和改名记录。
- `src/options.*`：设置元数据补全方式。
- `test/`：自动化测试。

## 许可证

本项目使用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。
