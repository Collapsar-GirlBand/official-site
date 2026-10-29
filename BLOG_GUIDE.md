# 📻 COLLAPSAR 独立静态博客使用与维护指南

本博客系统遵循你的要求设计为**独立静态架构**，保持与主站相同的黑洞深空暗黑美学，支持**图文混排**与**直接在网页内预览播放 YouTube 视频**，且**主页面完全不可进入（无任何公开跳转入口）**。

---

## 一、如何访问博客（进入方式）

由于主页面**没有放置任何入口链接**，普通访客在首页无法直接点击进入。
只有知道专属地址的你可以通过在浏览器地址栏直接输入访问：

| 环境 | 访问地址 |
| :--- | :--- |
| **本地开发 (Dev)** | `http://localhost:3000/#/blog` （推荐）<br>或 `http://localhost:3000/?page=blog` |
| **线上部署 (GitHub Pages)** | `https://collapsar-girlband.github.io/official-site/#/blog` |
| **线上部署 (Vercel / 自定义域名)** | `https://your-domain.com/#/blog` |

> 💡 **为什么推荐 `/#/blog`？**  
> Hash 路由（`#/blog`）纯由前端 JavaScript 监听，**绝不会触发静态 Web 服务器（如 GitHub Pages、Nginx、S3）的 404 错误**，在任何托管平台均可 100% 稳定直达。

---

## 二、功能特性概览

1. **YouTube 视频内联播放**：
   - 无论在文章列表还是正文内，均支持 16:9 自适应高清播放器。
   - 网页上**直接点击即可原地播放**，无需跳转离开网站。
   - 自动解析任意格式的 YouTube 链接（完整链接、短链接、embed 链接或纯 ID 均可）。
   - 采用 Facade 模式优化加载性能，不卡顿、不拖慢首屏。
2. **多图画廊与全屏灯箱（Lightbox）**：
   - 支持单张图片或多图网格排版。
   - 点击任意图片均可进入全屏暗黑大图预览，支持 `ESC` 键关闭、键盘左右键快速切图。
3. **即时搜索与分类筛选**：
   - 支持按分类标签（全部、音视频 MEDIA、视觉 VISUALS、随笔 NOTES）一键筛选。
   - 支持按中英文标题、正文内容、标签关键词实时模糊搜索。
4. **双语支持（中 / EN）**：
   - 右上角可一键切换中英文，与全站语言设置无缝同步。
5. **文章直链分享**：
   - 点击每篇日志右上角的「SHARE」按钮，自动复制该篇的专用直达链接（如 `#/blog?slug=xxx`）。
6. **优雅返回主站**：
   - 博客左上角提供精致的「← MAIN SITE / 返回主站」按钮，点击即可平滑退回主页。

---

## 三、如何添加与修改文章

所有的博客文章数据都集中在项目文件：
📂 `content/blog.ts`

### 1. 新增一篇文章
打开 [`content/blog.ts`](file:///f:/GameDemo/official-site-clone/content/blog.ts)，在 `BLOG_POSTS` 数组的最上方加入一个新的对象：

```ts
{
  id: 'post-004', // 唯一ID
  slug: 'my-new-story', // 英文短链
  title: {
    zh: '我的新曲记录与现场视频',
    en: 'My New Song & Live Video',
  },
  date: '2026.04.01',
  category: 'media', // 可选: 'notes' | 'media' | 'visuals'
  tags: ['Live', 'Guitar', 'YouTube'],
  readTime: '3 min read',
  excerpt: {
    zh: '这里是文章在列表展示时的摘要文字...',
    en: 'Here is the excerpt for the post...',
  },
  // 🌟 如果希望在列表顶部就直接提供 YouTube 播放器：
  featuredYoutube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  
  // 🌟 文章正文内容块（自由组合文字、标题、图片、画廊、视频）：
  blocks: [
    {
      type: 'paragraph',
      content: {
        zh: '这里是正文的第一段文字...',
        en: 'First paragraph of your post...',
      },
    },
    {
      type: 'heading',
      content: {
        zh: '现场实录视频',
        en: 'Live Footage',
      },
    },
    {
      type: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ', // 支持各类 YouTube 格式
      title: {
        zh: '现场演奏版本',
        en: 'Live Performance Version',
      },
      caption: {
        zh: '现场使用 Roland JC-120 与 Fender Jazzmaster',
        en: 'Recorded with Roland JC-120 and Fender Jazzmaster',
      },
    },
    {
      type: 'quote',
      content: {
        zh: '“这是引用的一句话金句。”',
        en: '"A memorable quote here."',
      },
    },
    {
      type: 'image',
      url: 'gallery/随手画.webp', // 支持本地 public 资源或网络图片
      caption: {
        zh: '排练速写记录',
        en: 'Rehearsal sketch',
      },
    },
  ],
},
```

---

## 四、支持的内容类型块说明

在 `blocks` 数组中，你可以自由添加以下几种类型的块：

### 1. 段落文字 (`paragraph`)
```ts
{
  type: 'paragraph',
  content: {
    zh: '中文段落文字',
    en: 'English paragraph text',
  },
}
```

### 2. 小标题 (`heading`)
```ts
{
  type: 'heading',
  content: {
    zh: '小标题名称',
    en: 'Section Heading',
  },
}
```

### 3. 金句引用 (`quote`)
```ts
{
  type: 'quote',
  content: {
    zh: '“所引用的文字内容”',
    en: '"The quoted text"',
  },
}
```

### 4. 单张图片 (`image`)
```ts
{
  type: 'image',
  url: 'gallery/随手画.webp', // 或网络图片 'https://images.unsplash.com/...'
  caption: {
    zh: '图片底部说明文字（可选）',
    en: 'Optional image caption',
  },
}
```

### 5. 多图网格画廊 (`gallery`)
```ts
{
  type: 'gallery',
  images: [
    { url: 'gallery/吉他包.webp', caption: { zh: '图一', en: 'Photo 1' } },
    { url: 'gallery/小憩.webp', caption: { zh: '图二', en: 'Photo 2' } },
    { url: 'gallery/随手画.webp', caption: { zh: '图三', en: 'Photo 3' } },
  ],
}
```

### 6. YouTube 视频嵌入播放 (`youtube`)
```ts
{
  type: 'youtube',
  url: 'https://www.youtube.com/watch?v=VIDEO_ID', // 或短链 https://youtu.be/VIDEO_ID
  title: {
    zh: '视频标题',
    en: 'Video Title',
  },
  caption: {
    zh: '视频下方补充说明',
    en: 'Video subtitle or equipment info',
  },
}
```

---

## 五、技术实现与文件目录

- [`content/blog.ts`](file:///f:/GameDemo/official-site-clone/content/blog.ts)：博客数据模型、文章列表与 YouTube ID 提取算法。
- [`components/BlogPage.tsx`](file:///f:/GameDemo/official-site-clone/components/BlogPage.tsx)：博客主页面（分类过滤、搜索、文章渲染、响应式布局）。
- [`components/YouTubePlayer.tsx`](file:///f:/GameDemo/official-site-clone/components/YouTubePlayer.tsx)：YouTube 播放器（16:9 响应式、Facade 预览与网页直播）。
- [`components/BlogLightbox.tsx`](file:///f:/GameDemo/official-site-clone/components/BlogLightbox.tsx)：图片全屏画廊灯箱组件。
- [`App.tsx`](file:///f:/GameDemo/official-site-clone/App.tsx)：无侵入式路由判断（保持主页完全不暴露博客入口）。
