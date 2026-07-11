# rename-cns：论文文献智能改名

版本 1.03 / Version 1.03

一个 Chrome/Edge 浏览器扩展，在下载论文时自动命名为：<br>
A Chrome/Edge extension that renames downloaded papers as:

```text
年份-发表期刊-文献名称.pdf
YYYY-Journal-Title.pdf
```

例如 / Example:

```text
2023-bioRxiv-Structure-conditioned masked language models for protein sequence design generalize beyond the native sequence space.pdf
```

## 主要功能 / Features

- 监听论文下载，并在文件落盘前建议新文件名。<br>
  Detects paper downloads and suggests a filename before saving.
- 读取网页公开元数据，并通过 Crossref、PubMed 补全标题、期刊和年份。<br>
  Reads public page metadata and uses Crossref/PubMed to complete title, journal, and year.
- 支持 Cell、Research Square、bioRxiv 等常见论文下载地址。<br>
  Supports common paper URLs from Cell, Research Square, bioRxiv, and more.

## 新手安装 / Beginner installation

### 方法一：下载 ZIP（推荐） / Option 1: Download ZIP (recommended)

1. 打开 GitHub 仓库：[rename-cns](https://github.com/hmj238751-ui/rename-cns)。<br>
   Open the GitHub repository: [rename-cns](https://github.com/hmj238751-ui/rename-cns).
2. 点击绿色的 **Code** → **Download ZIP**。<br>
   Click the green **Code** button, then choose **Download ZIP**.
3. 打开电脑的“下载”文件夹，找到 `rename-cns-main.zip`。<br>
   Open your Downloads folder and find `rename-cns-main.zip`.
4. 双击 ZIP 解压，并把解压出的 `rename-cns-main` 文件夹移动到桌面或“文档”文件夹。不要删除这个文件夹。<br>
   Extract the ZIP, then move the `rename-cns-main` folder to your Desktop or Documents folder. Keep this folder.
5. 打开 Chrome，进入 `chrome://extensions`；打开右上角“开发者模式”。<br>
   Open Chrome, visit `chrome://extensions`, and enable Developer mode.
6. 点击 **加载已解压的扩展**，选择刚才解压的 `rename-cns-main` 文件夹。<br>
   Click **Load unpacked** and select the extracted `rename-cns-main` folder.

### 方法二：使用 Git Clone / Option 2: Clone with Git

如果你已经安装 Git，在终端执行：<br>
If Git is already installed, run:

```bash
git clone https://github.com/hmj238751-ui/rename-cns.git ~/Documents/rename-cns
```

然后在 Chrome 的 `chrome://extensions` 页面选择：<br>
Then select this folder in `chrome://extensions`:

```text
~/Documents/rename-cns
```

Windows 用户也可以将仓库克隆到“文档”文件夹，再选择该文件夹。<br>
Windows users can clone the repository into Documents and select that folder.

## 使用方法 / Usage

1. 安装扩展后，打开一个论文网页并刷新页面。<br>
   After installation, open a paper page and refresh it.
2. 点击论文的 PDF 下载按钮。<br>
   Click the paper's PDF download button.
3. 文件会自动命名为“年份-期刊-标题”。<br>
   The file will be named as `YYYY-Journal-Title`.

如果更新了插件代码，请在 `chrome://extensions` 点击扩展的“重新加载”，然后再次刷新论文网页。<br>
After updating the extension, click **Reload** in `chrome://extensions`, then refresh the paper page again.

## 隐私说明 / Privacy

扩展只读取论文页面公开元数据、下载 URL 和下载信息；设置与改名记录保存在本地。DOI/PII 可能被发送到 Crossref 或 PubMed 进行元数据查询，不会上传论文正文或账号密码。<br>
The extension reads only public paper metadata, download URLs, and download information. Settings and rename history stay local. DOI/PII may be sent to Crossref or PubMed for metadata lookup; paper contents and credentials are not uploaded.

## 常见问题 / Troubleshooting

- 已经下载完成的旧文件不会自动改名，只处理新的下载。<br>
  Existing files are not renamed; only new downloads are handled.
- 如果没有改名，请确认扩展已启用、页面已刷新，并检查网页是否提供标题或 DOI。<br>
  If renaming does not happen, make sure the extension is enabled, refresh the page, and check that the page or URL provides a title or DOI.
- 浏览器扩展通常不能在下载完成后修改任意本地文件名，因此本项目在文件落盘前处理名称。<br>
  Browser extensions generally cannot rename arbitrary local files after download, so this project handles the name before saving.

## 开发者 / Developers

```bash
npm run check
npm test
```

GitHub Actions 会在 push 和 pull request 时自动运行检查。<br>
GitHub Actions runs these checks on every push and pull request.

本项目使用 MIT License。<br>
This project is licensed under the MIT License.
