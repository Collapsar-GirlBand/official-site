/**
 * COLLAPSAR Blog & Log Transmission Data
 * 
 * =========================================================================
 * 📖 BLOG 内容维护与扩展指南 (HOW TO ADD / EDIT POSTS):
 * =========================================================================
 * 1. 增加新文章：在下面的 BLOG_POSTS 数组最前面复制一个对象即可。
 * 2. 字段说明：
 *    - id / slug: 唯一标识符（英文小写与横杠，如 'my-first-post'）
 *    - title: 双语标题 { zh: '中文标题', en: 'English Title' }
 *    - date: 发布日期，如 '2026.03.20'
 *    - category: 分类，可选 'notes' (随想文字) | 'media' (音画/视频) | 'visuals' (视觉美术)
 *    - tags: 标签数组，如 ['音乐', '排练', 'YouTube']
 *    - readTime: 阅读时间估计，如 '3 min read'
 *    - excerpt: 列表摘要引言 { zh: '...', en: '...' }
 *    - coverImage: 封面图片 URL (可选，支持本地 /gallery/xxx.webp 或外部网络图片)
 *    - featuredYoutube: 列表直显的 YouTube 链接或 ID (可选，支持完整 URL 或短链接)
 *    - blocks: 文章正文内容块，支持：
 *        • paragraph: 普通段落文字 { type: 'paragraph', content: { zh: '...', en: '...' } }
 *        • heading: 小标题 { type: 'heading', content: { zh: '...', en: '...' } }
 *        • quote: 引用金句 { type: 'quote', content: { zh: '...', en: '...' } }
 *        • image: 图片 { type: 'image', url: '...', caption: { zh: '...', en: '...' } }
 *        • gallery: 多图网格 { type: 'gallery', images: [{ url: '...', caption: ... }] }
 *        • youtube: 网页直接播放的 YouTube 视频 { type: 'youtube', url: '...', title: ..., caption: ... }
 * 
 * 📺 YouTube 视频链接格式支持：
 *    - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *    - https://youtu.be/dQw4w9WgXcQ
 *    - https://www.youtube.com/embed/dQw4w9WgXcQ
 *    - 直接填 ID：dQw4w9WgXcQ
 * =========================================================================
 */

export type BlogCategory = 'all' | 'notes' | 'media' | 'visuals';

export interface BlogBlockText {
  type: 'paragraph' | 'heading' | 'quote';
  content: { zh: string; en: string };
}

export interface BlogBlockImage {
  type: 'image';
  url: string;
  caption?: { zh: string; en: string };
  alt?: { zh: string; en: string };
}

export interface BlogBlockGallery {
  type: 'gallery';
  images: Array<{
    url: string;
    caption?: { zh: string; en: string };
    alt?: { zh: string; en: string };
  }>;
}

export interface BlogBlockYouTube {
  type: 'youtube';
  url: string; // 完整链接或 11 位 video id
  title?: { zh: string; en: string };
  caption?: { zh: string; en: string };
}

export type BlogContentBlock =
  | BlogBlockText
  | BlogBlockImage
  | BlogBlockGallery
  | BlogBlockYouTube;

export interface BlogPost {
  id: string;
  slug: string;
  title: { zh: string; en: string };
  date: string;
  category: 'notes' | 'media' | 'visuals';
  tags: string[];
  readTime: string;
  excerpt: { zh: string; en: string };
  coverImage?: string;
  featuredYoutube?: string; // 首页/列表直接展示并支持播放的视频
  blocks: BlogContentBlock[];
}

/**
 * 从各类 YouTube 链接中提取标准的 11 位视频 ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // 如果直接是 11 位的视频 ID (字母、数字、短横线、下划线)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 常见 YouTube URL 模式正则匹配
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * 智能解析项目静态资源 URL（自动适应 Vite Base 路径）
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = import.meta.env.BASE_URL || '/';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${prefix}${cleanPath}`;
}

/**
 * 博客文章列表数据（预置示范文章）
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-001',
    slug: 'stellar-frequencies-live-demo',
    title: {
      zh: '坍缩共振与信号解构：排练室现场与编曲备忘录',
      en: 'Collapse Resonance & Signal Deconstruction: Rehearsal Demo & Arrangement Notes',
    },
    date: '2026.03.12',
    category: 'media',
    tags: ['Live', 'Rehearsal', 'YouTube', 'Arrangement'],
    readTime: '4 min read',
    excerpt: {
      zh: '在失真踏板与低音轰鸣的交界处，我们试图捕捉星体引力波穿过拾音器的频率。本篇包含排练室实录现场视频与编曲思路整理。',
      en: 'At the boundary where overdrive pedals meet the low bass rumble, we seek frequencies reminiscent of gravitational waves captured by guitar pickups.',
    },
    // 示范：内置可直接在网页播放的 YouTube 视频（经典现场演奏/演示）
    featuredYoutube: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // lofi / live ambiance demo
    blocks: [
      {
        type: 'paragraph',
        content: {
          zh: '这周的排练重点放在了副歌进入前的减速顿挫感上。原本设想用密集的踩镲铺满空白，但实录后发现，彻底留白半个小节、仅保留贝斯单音延音的效果更具吞噬感。',
          en: 'Our rehearsal focus this week shifted to the deceleration pause right before the chorus. Stripping out the hi-hat and leaving a pure bass drone created a much deeper void-like pull.',
        },
      },
      {
        type: 'heading',
        content: {
          zh: '现场实机预览与试听信号',
          en: 'Live Monitor Preview & Signal Stream',
        },
      },
      {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        title: {
          zh: '排练室音频测试轨与环境氛围捕捉',
          en: 'Studio Audio Check & Atmospheric Tracking',
        },
        caption: {
          zh: '可在网页直接点击播放试听。测试设备：Fender Jazzmaster + RAT Distortion + Eventide Space。',
          en: 'Streamable directly on this page. Gear used: Fender Jazzmaster + RAT + Eventide Space.',
        },
      },
      {
        type: 'quote',
        content: {
          zh: '“真正的噪音不是杂乱无章，而是宇宙背景辐射被放大一万倍后的心跳。”',
          en: '"True noise is not chaotic clutter; it is the heartbeat of cosmic microwave background amplified ten thousand times."',
        },
      },
      {
        type: 'paragraph',
        content: {
          zh: '接下来的一周，我们将进一步打磨人声与管乐采样的融合度。如果你也在探索类似的暗黑自赏声效，欢迎在信号频道中与我们交流。',
          en: 'Over the coming week, we will refine the balance between lead vocals and brass sampler textures. Feel free to beam your signals our way.',
        },
      },
    ],
  },
  {
    id: 'post-002',
    slug: 'visual-sketches-and-quiet-moments',
    title: {
      zh: '视野之外的切片：关于乐器、速写与日常定格',
      en: 'Slices Beyond the Horizon: Instruments, Quick Sketches & Quiet Moments',
    },
    date: '2026.02.28',
    category: 'visuals',
    tags: ['Gallery', 'Art', 'Sketch', 'Band Life'],
    readTime: '3 min read',
    excerpt: {
      zh: '在琴弦停止震动的片刻，笔尖留下的往往是那些未被射灯照亮的细微神态。这里整理了近期的一些插画与排练花絮速写。',
      en: 'In moments when guitar strings cease vibrating, pencil sketches capture subtle expressions unseen beneath stage lights.',
    },
    coverImage: 'gallery/随手画.webp',
    blocks: [
      {
        type: 'paragraph',
        content: {
          zh: '舞台上的光芒是短暂的，更多漫长的时光消耗在调音旋钮、潮湿的琴盒以及随手抓起的速写本之间。',
          en: 'Stage lights are fleeting; far more time is dissolved between tuning pegs, damp cases, and quick strokes on scratchpads.',
        },
      },
      {
        type: 'gallery',
        images: [
          {
            url: 'gallery/吉他包.webp',
            caption: {
              zh: '背着乐器出发的清晨',
              en: 'Early morning departures with instruments',
            },
          },
          {
            url: 'gallery/小憩.webp',
            caption: {
              zh: '排练间隙的长椅小憩',
              en: 'A fleeting rest on the bench during rehearsals',
            },
          },
          {
            url: 'gallery/随手画.webp',
            caption: {
              zh: '散落在乐谱背面的速写稿',
              en: 'Doodles scattered across sheet music margins',
            },
          },
        ],
      },
      {
        type: 'paragraph',
        content: {
          zh: '点击上方任意图片可启动全屏无损浏览。每一张图像都记录着一个温度不同的午后，它们将最终汇聚成下一张 EP 的视觉雏形。',
          en: 'Click any photo above to inspect in full-screen clarity. Each frame preserves an afternoon of distinct resonance.',
        },
      },
    ],
  },
  {
    id: 'post-003',
    slug: 'midnight-radio-transmissions',
    title: {
      zh: '夜航日志：在重力奇点前调试未命名的合成器音色',
      en: 'Night Flight Log: Tuning Unnamed Synth Patches Before the Gravitational Singularity',
    },
    date: '2026.01.19',
    category: 'notes',
    tags: ['Notes', 'Philosophy', 'Cosmos', 'Collapsar'],
    readTime: '5 min read',
    excerpt: {
      zh: '凌晨三点零七分，城市的电网噪声逐渐平息。在没有灯火的房间里，合成器的振荡器像是一艘孤独穿梭在事件视界外的探测器。',
      en: 'At 3:07 AM, urban electrical hum subsides. In a dark room, analog oscillators behave like solitary probes skirting the event horizon.',
    },
    blocks: [
      {
        type: 'paragraph',
        content: {
          zh: '坍缩星（COLLAPSAR）在天文学上指代大质量恒星在燃料耗尽时，核心无法抵抗自身引力而发生的终极坠落。这几乎是宇宙中最决绝又浪漫的物理过程。',
          en: 'In astrophysics, a Collapsar signifies an exhausted star undergoing catastrophic collapse under its own gravity. It remains one of the most resolute and romantic occurrences in the cosmos.',
        },
      },
      {
        type: 'heading',
        content: {
          zh: '关于未公开音频的频段试验',
          en: 'Spectrum Experiments on Unreleased Tracks',
        },
      },
      {
        type: 'quote',
        content: {
          zh: '“当所有音符都向内塌缩，剩余的并非虚无，而是致密得无法逃逸的引力场。”',
          en: '"When all musical notes collapse inward, what remains is not nothingness, but an inescapable gravitational field."',
        },
      },
      {
        type: 'paragraph',
        content: {
          zh: '这个博客被设定在主站看不见的轨道之中。如果你能抵达这里，说明你已经接收到了这封来自引力边缘的无线电信标。感谢你的驻足。',
          en: 'This station log is hidden in an unlisted orbit outside the main stage. Arriving here proves you have picked up our beacon at the gravitational perimeter.',
        },
      },
    ],
  },
];
