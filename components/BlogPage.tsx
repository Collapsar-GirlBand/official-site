import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Radio,
  Share2,
  Check,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { 
  BLOG_POSTS, 
  BlogPost, 
  BlogCategory, 
  BlogContentBlock,
  resolveAssetUrl 
} from '../content/blog';
import { useLanguage } from '../content/language';
import YouTubePlayer from './YouTubePlayer';
import BlogLightbox, { LightboxImage } from './BlogLightbox';

interface BlogPageProps {
  onBackToHome?: () => void;
}

// 4-Point Star (Diffraction Spike) Component
const StarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className}>
    <path d="M20 0 C22 15 25 18 40 20 C25 22 22 25 20 40 C18 25 15 22 0 20 C15 18 18 15 20 0 Z" fill="currentColor" />
  </svg>
);

export const BlogPage: React.FC<BlogPageProps> = ({ onBackToHome }) => {
  const { language, setLanguage } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({
    // 默认展开第一篇，以便直接展示精彩内容
    [BLOG_POSTS[0]?.id || '']: true,
  });

  // 图片灯箱状态
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // 分享复制状态
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 展开 / 折叠文章
  const toggleExpand = (id: string) => {
    setExpandedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 展开所有 / 收起所有
  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    BLOG_POSTS.forEach(p => { allExpanded[p.id] = true; });
    setExpandedPosts(allExpanded);
  };
  const collapseAll = () => {
    setExpandedPosts({});
  };

  // 打开单张图片预览
  const openSingleImage = (url: string, caption?: string) => {
    setLightboxImages([{ url: resolveAssetUrl(url), caption }]);
    setLightboxIndex(0);
  };

  // 打开画廊图片预览
  const openGalleryImages = (images: Array<{ url: string; caption?: { zh: string; en: string } }>, startIndex: number) => {
    const formatted = images.map(img => ({
      url: resolveAssetUrl(img.url),
      caption: img.caption ? img.caption[language] : undefined,
    }));
    setLightboxImages(formatted);
    setLightboxIndex(startIndex);
  };

  // 复制文章永久链接
  const handleCopyLink = (post: BlogPost) => {
    const url = `${window.location.origin}${window.location.pathname}#/blog?slug=${post.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    }
  };

  // 过滤文章
  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter(post => {
      // 分类筛选
      if (selectedCategory !== 'all' && post.category !== selectedCategory) {
        return false;
      }
      // 搜索过滤
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = post.title.zh.toLowerCase().includes(q) || post.title.en.toLowerCase().includes(q);
        const excerptMatch = post.excerpt.zh.toLowerCase().includes(q) || post.excerpt.en.toLowerCase().includes(q);
        const tagMatch = post.tags.some(t => t.toLowerCase().includes(q));
        const blockMatch = post.blocks.some(b => {
          if ('content' in b) {
            return b.content.zh.toLowerCase().includes(q) || b.content.en.toLowerCase().includes(q);
          }
          return false;
        });
        if (!titleMatch && !excerptMatch && !tagMatch && !blockMatch) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // 渲染正文内容块
  const renderBlock = (block: BlogContentBlock, index: number) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <p key={index} className="my-4 text-base leading-relaxed text-neutral-300 font-serif tracking-normal md:text-lg">
            {block.content[language]}
          </p>
        );

      case 'heading':
        return (
          <div key={index} className="mt-8 mb-4 flex items-center space-x-3">
            <StarIcon size={14} className="text-white/70" />
            <h3 className="font-serif text-lg font-medium tracking-wider text-white md:text-xl">
              {block.content[language]}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        );

      case 'quote':
        return (
          <blockquote key={index} className="my-6 relative border-l-2 border-white/60 bg-white/[0.02] py-4 px-5 italic text-white/90">
            <div className="font-serif text-base tracking-wide leading-relaxed md:text-lg">
              {block.content[language]}
            </div>
            <div className="mt-2 font-mono text-[10px] text-white/40 tracking-widest uppercase">
              // COLLAPSAR_INTERNAL_RESONANCE
            </div>
          </blockquote>
        );

      case 'image':
        return (
          <div key={index} className="my-6">
            <div 
              onClick={() => openSingleImage(block.url, block.caption ? block.caption[language] : undefined)}
              className="group relative cursor-zoom-in overflow-hidden border border-white/10 bg-black/40 transition-colors hover:border-white/40"
            >
              <img
                src={resolveAssetUrl(block.url)}
                alt={block.alt ? block.alt[language] : 'Blog illustration'}
                loading="lazy"
                className="max-h-[500px] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/[0.03]" />
            </div>
            {block.caption && (
              <p className="mt-2 text-center font-mono text-xs text-white/50 tracking-wider">
                {block.caption[language]}
              </p>
            )}
          </div>
        );

      case 'gallery':
        return (
          <div key={index} className="my-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {block.images.map((img, imgIdx) => (
                <div
                  key={imgIdx}
                  onClick={() => openGalleryImages(block.images, imgIdx)}
                  className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden border border-white/10 bg-black/50 transition-colors hover:border-white/40"
                >
                  <img
                    src={resolveAssetUrl(img.url)}
                    alt={img.caption ? img.caption[language] : `Gallery ${imgIdx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 text-[11px] font-mono text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                      {img.caption[language]}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center font-mono text-[11px] text-white/40 tracking-widest">
              {language === 'zh' ? '（点击任意图片可全屏画廊浏览）' : '(Click any image to view gallery in full screen)'}
            </p>
          </div>
        );

      case 'youtube':
        return (
          <div key={index} className="my-6">
            <YouTubePlayer
              urlOrId={block.url}
              title={block.title ? block.title[language] : undefined}
              caption={block.caption ? block.caption[language] : undefined}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white selection:bg-white selection:text-black">
      {/* 顶部星空背景微光 */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
      
      {/* 顶部微细网格底纹 */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-15" 
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* 顶部固定导航栏 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          {/* 左侧：返回主站与标题 */}
          <div className="flex items-center space-x-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="group flex items-center space-x-1.5 rounded border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs font-mono text-white/70 transition-all hover:border-white/50 hover:bg-white/10 hover:text-white"
                title={language === 'zh' ? '返回主站' : 'Back to Main Site'}
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">{language === 'zh' ? '返回主站' : 'MAIN SITE'}</span>
              </button>
            )}

            <div className="flex items-center space-x-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold tracking-[0.25em] text-white">
                  COLLAPSAR // LOG
                </span>
                <span className="hidden font-mono text-[9px] text-white/40 tracking-wider sm:inline">
                  TRANSMISSION FREQUENCY & FIELD ARCHIVE
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：操作与语言切换 */}
          <div className="flex items-center space-x-3">
            {/* 语言切换 */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center space-x-1 rounded border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-white/80 transition-all hover:border-white hover:text-white"
              aria-label="Toggle language"
            >
              <Globe size={13} />
              <span className="font-semibold">{language === 'zh' ? 'EN' : '中文'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 页面主容器 */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-14">
        {/* Banner 标题区 */}
        <div className="mb-10 border-b border-white/10 pb-8 md:mb-12">
          <div className="flex items-center space-x-2 font-mono text-[11px] text-white/50 tracking-[0.3em] uppercase">
            <Radio size={13} className="text-white/60 animate-pulse" />
            <span>DEEP VOID OBSERVATION // PRIVATE FEED</span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-light tracking-[0.1em] text-white md:text-5xl">
            {language === 'zh' ? '引力波与星系日志' : 'Gravity Waves & Galaxy Logs'}
          </h1>

          <p className="mt-4 max-w-2xl font-serif text-sm leading-relaxed text-white/60 md:text-base">
            {language === 'zh' 
              ? '坍缩星（COLLAPSAR）的非公开碎片传输：记录声音实验、排练现场、视觉切片与未被公开发送的深夜思考。'
              : 'Unlisted transmissions from COLLAPSAR: sound experiments, rehearsal footage, visual slices, and late-night signals.'}
          </p>

          {/* 筛选与搜索工具条 */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* 分类筛选 Tab */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', zh: '全部', en: 'ALL' },
                  { id: 'media', zh: '音视频 (YouTube)', en: 'MEDIA' },
                  { id: 'visuals', zh: '视觉记录', en: 'VISUALS' },
                  { id: 'notes', zh: '随笔日志', en: 'NOTES' },
                ] as Array<{ id: BlogCategory; zh: string; en: string }>
              ).map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-mono tracking-wider transition-all ${
                      isActive
                        ? 'border border-white bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                        : 'border border-white/15 bg-white/[0.03] text-white/65 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {language === 'zh' ? cat.zh : cat.en}
                  </button>
                );
              })}
            </div>

            {/* 搜索框 */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'zh' ? '搜索标题、标签或内容...' : 'Search logs, tags...'}
                className="w-full rounded border border-white/15 bg-black/60 py-1.5 pl-9 pr-3 font-mono text-xs text-white placeholder-white/30 backdrop-blur-sm transition-colors focus:border-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 文章计数与批量折叠控制 */}
          <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-white/40">
            <span>
              {language === 'zh' ? `共匹配 ${filteredPosts.length} 篇信号日志` : `${filteredPosts.length} TRANSMISSION(S) FOUND`}
            </span>
            <div className="flex items-center space-x-3">
              <button 
                type="button" 
                onClick={expandAll}
                className="hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                {language === 'zh' ? '全部展开' : 'EXPAND ALL'}
              </button>
              <span>/</span>
              <button 
                type="button" 
                onClick={collapseAll}
                className="hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                {language === 'zh' ? '全部收起' : 'COLLAPSE ALL'}
              </button>
            </div>
          </div>
        </div>

        {/* 文章列表 */}
        {filteredPosts.length === 0 ? (
          <div className="my-16 rounded border border-dashed border-white/20 p-12 text-center">
            <Radio size={28} className="mx-auto text-white/30 animate-pulse" />
            <h4 className="mt-4 font-mono text-sm tracking-widest text-white/80 uppercase">
              NO TRANSMISSIONS DETECTED // 未匹配到任何记录
            </h4>
            <p className="mt-2 font-serif text-xs text-white/40">
              {language === 'zh' ? '尝试更换关键词或清除搜索条件' : 'Try adjusting your search query or switching categories.'}
            </p>
            <button
              type="button"
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-6 rounded border border-white/30 px-4 py-1.5 font-mono text-xs text-white transition hover:border-white hover:bg-white hover:text-black"
            >
              {language === 'zh' ? '重置筛选条件' : 'RESET FILTERS'}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredPosts.map((post, postIndex) => {
              const isExpanded = Boolean(expandedPosts[post.id]);

              return (
                <article
                  key={post.id}
                  id={post.slug}
                  className="group relative rounded-sm border border-white/10 bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.03] md:p-8"
                >
                  {/* 科技装饰四角 */}
                  <div className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-white/40" />
                  <div className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-white/40" />

                  {/* 文章元数据行 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs text-white/50">
                    <div className="flex items-center space-x-3">
                      <span className="text-white/80 font-bold tracking-widest">
                        LOG #{String(postIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{post.date}</span>
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{post.readTime}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(post)}
                        className="flex items-center space-x-1 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 hover:border-white/40 hover:text-white transition"
                        title={language === 'zh' ? '复制文章直链' : 'Copy permalink'}
                      >
                        {copiedId === post.id ? <Check size={11} className="text-emerald-400" /> : <Share2 size={11} />}
                        <span>{copiedId === post.id ? (language === 'zh' ? '已复制' : 'COPIED') : 'SHARE'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h2 
                    onClick={() => toggleExpand(post.id)}
                    className="mt-4 cursor-pointer font-serif text-xl font-normal leading-snug tracking-wide text-white transition-colors group-hover:text-white md:text-2xl"
                  >
                    {post.title[language]}
                  </h2>

                  {/* 标签列表 */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1 rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60"
                      >
                        <Tag size={9} />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>

                  {/* 摘要描述 */}
                  <p className="mt-4 font-serif text-sm leading-relaxed text-white/70 md:text-base">
                    {post.excerpt[language]}
                  </p>

                  {/* 列表中直显的 YouTube 视频播放器（用户要求：网页上就可预览播放！） */}
                  {post.featuredYoutube && (
                    <div className="mt-5">
                      <YouTubePlayer
                        urlOrId={post.featuredYoutube}
                        title={post.title[language]}
                        caption={language === 'zh' ? '点击可在网页中直接播放预览该 YouTube 视频' : 'Click to stream preview directly on this page'}
                      />
                    </div>
                  )}

                  {/* 封面图片展示（若无主要视频且有封面） */}
                  {!post.featuredYoutube && post.coverImage && (
                    <div className="mt-5 overflow-hidden border border-white/10">
                      <img
                        src={resolveAssetUrl(post.coverImage)}
                        alt={post.title[language]}
                        onClick={() => openSingleImage(post.coverImage!, post.title[language])}
                        className="max-h-[420px] w-full cursor-zoom-in object-cover transition-transform duration-500 hover:scale-[1.02]"
                      />
                    </div>
                  )}

                  {/* 展开/折叠的正文区块 */}
                  {isExpanded && (
                    <div className="mt-6 border-t border-white/15 pt-6 animate-fade-in">
                      {post.blocks.map((block, bIdx) => renderBlock(block, bIdx))}
                    </div>
                  )}

                  {/* 底部展开/收起按钮 */}
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(post.id)}
                      className="group/btn flex items-center space-x-1.5 font-mono text-xs tracking-wider text-white/75 transition-colors hover:text-white"
                    >
                      <span>{isExpanded ? (language === 'zh' ? '收起完整记录' : 'COLLAPSE LOG') : (language === 'zh' ? '展开阅读完整记录' : 'READ FULL LOG')}</span>
                      {isExpanded ? (
                        <ChevronUp size={14} className="transition-transform group-hover/btn:-translate-y-0.5" />
                      ) : (
                        <ChevronDown size={14} className="transition-transform group-hover/btn:translate-y-0.5" />
                      )}
                    </button>

                    <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                      COLLAPSAR_TRANSMISSION
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 底部给博主的使用指引小卡片 */}
        <section className="mt-16 rounded border border-white/15 bg-white/[0.02] p-6 text-white/70">
          <div className="flex items-center space-x-2 font-mono text-xs text-white/90">
            <Sparkles size={14} className="text-yellow-400" />
            <span className="font-semibold tracking-wider">
              {language === 'zh' ? '站长维护提示 // BLOG GUIDE' : 'STATION LOG QUICK GUIDE'}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/60 font-serif">
            {language === 'zh'
              ? '本博客为独立静态布局，主页面无公开入口。想要增加新文章、修改文字、添加图片或嵌入 YouTube 视频？直接编辑项目中的 content/blog.ts 文件即可（已预置详细注释和示例模板）。'
              : 'This blog is a decoupled static station without entry links on the main page. To add new posts, photos, or streamable YouTube videos, simply edit content/blog.ts.'}
          </p>
        </section>
      </main>

      {/* 底部 Footer */}
      <footer className="mt-12 border-t border-white/10 bg-black/90 py-8 text-center font-mono text-xs text-white/40">
        <p className="tracking-widest">COLLAPSAR © 2026 // ALL SIGNALS RESERVED</p>
        <p className="mt-1 text-[10px] tracking-wider text-white/30">
          SECRET LOG TRANSMISSION FREQUENCY: 432.08 MHz
        </p>
      </footer>

      {/* 全屏图片灯箱 */}
      <BlogLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />
    </div>
  );
};

export default BlogPage;
