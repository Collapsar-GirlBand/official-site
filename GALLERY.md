# 通关后画廊素材

图片放在 `public/gallery/`，例如 `public/gallery/new-art.webp`。本地网页中的访问地址是 `/gallery/new-art.webp`（部署到 GitHub Pages 时会自动加上站点子路径）。推荐使用 WebP；PNG、JPG 也可以。图片保持原始宽高比，画廊会完整显示，不会裁切。

每增加一幅画，在 `content/gallery.ts` 的 `GALLERY_ITEMS` 数组里添加一项：

```ts
{
  file: 'new-art.webp',
  title: { zh: '作品标题', en: 'Artwork Title' },
  description: { zh: '作品描述。', en: 'Artwork description.' },
},
```

`file` 必须与 `public/gallery/` 中的实际文件名完全一致，包括扩展名。已有的画作和对应文字也在这个数组中，直接修改即可。数组顺序就是画廊展示顺序。切换入口只在通关后出现，重新打开游戏也会默认显示原创曲页。
