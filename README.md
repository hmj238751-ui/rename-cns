# 论文文献智能改名

版本：1.03

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
- 支持 Cell、Research Square、bioRxiv 等常见论文下载地址。


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

## 支持的元数据来源

- 论文网页中的公开元数据。
- Crossref DOI 元数据。
- PubMed 元数据。
- Cell 的 PII 下载地址。
- Research Square 的文章地址和资产服务器地址。
- bioRxiv 的版本化 PDF 地址。

## 隐私说明

扩展只读取论文网页公开的元数据、下载地址和下载信息，用于完成文件命名功能。

- 设置和改名记录保存在本地。
- DOI 或 PII 可能会发送到 Crossref 或 PubMed 查询论文元数据。
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
