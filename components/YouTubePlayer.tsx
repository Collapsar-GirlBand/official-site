import React, { useState } from 'react';
import { Play, ExternalLink, Film } from 'lucide-react';
import { extractYouTubeId } from '../content/blog';

interface YouTubePlayerProps {
  urlOrId: string;
  title?: string;
  caption?: string;
  className?: string;
  initialPlay?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  urlOrId,
  title,
  caption,
  className = '',
  initialPlay = false,
}) => {
  const videoId = extractYouTubeId(urlOrId);
  const [isPlaying, setIsPlaying] = useState(initialPlay);
  const [imgError, setImgError] = useState(false);

  if (!videoId) {
    return (
      <div className={`my-4 flex items-center justify-center border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono text-red-300 ${className}`}>
        [INVALID_YOUTUBE_URL_OR_ID: {urlOrId}]
      </div>
    );
  }

  const youtubeExternalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  const thumbnailUrl = imgError
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div className={`group relative my-6 overflow-hidden rounded-sm border border-white/15 bg-black/80 transition-colors duration-300 hover:border-white/35 ${className}`}>
      {/* 科技装饰角标 */}
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-white/60 z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-white/60 z-10" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-2 w-2 border-l border-b border-white/60 z-10" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-2 w-2 border-r border-b border-white/60 z-10" />

      {/* 播放器主体 16:9 响应式比例 */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
        {isPlaying ? (
          <iframe
            src={embedUrl}
            title={title || `YouTube Video ${videoId}`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div
            onClick={() => setIsPlaying(true)}
            className="relative h-full w-full cursor-pointer select-none"
            role="button"
            tabIndex={0}
            aria-label={`Play YouTube video: ${title || videoId}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsPlaying(true);
              }
            }}
          >
            {/* 封面缩略图 */}
            <img
              src={thumbnailUrl}
              alt={title || 'YouTube thumbnail'}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover opacity-80 filter brightness-90 transition-all duration-500 group-hover:scale-[1.02] group-hover:brightness-100"
              loading="lazy"
            />

            {/* 暗部遮罩渐变 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />

            {/* 顶部信息行 */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-white/75 font-mono">
              <div className="flex items-center space-x-2 bg-black/60 px-2.5 py-1 backdrop-blur-md rounded border border-white/10">
                <Film size={13} className="text-white/80" />
                <span className="tracking-widest text-[10px]">VIDEO_SIGNAL // ID:{videoId}</span>
              </div>
              <a
                href={youtubeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center space-x-1 bg-black/60 px-2 py-1 backdrop-blur-md rounded border border-white/10 text-[10px] text-white/60 hover:text-white transition-colors"
                title="Open directly on YouTube"
              >
                <span>YOUTUBE</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {/* 居中播放按钮 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/70 text-white shadow-[0_0_25px_rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-white group-hover:bg-white group-hover:text-black">
                <Play size={26} className="ml-1 fill-current" />
              </div>
              <span className="mt-3 font-mono text-[11px] tracking-[0.25em] text-white/80 uppercase">
                CLICK TO STREAM / 播放预览
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息栏（若有标题或附注） */}
      {(title || caption) && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white/70">
          {title && <div className="font-medium text-white/90 text-sm tracking-wide">{title}</div>}
          {caption && <div className="mt-1 font-mono text-[11px] text-white/50 leading-relaxed">{caption}</div>}
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
