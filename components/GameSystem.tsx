import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BAND_MEMBERS, SOCIAL_LINKS } from '../content/data';
import LanguageSwitch from './LanguageSwitch';
import { STORIES_EN, MEMBER_NAMES } from '../content/english';
import { STORY_SCRIPTS } from '../content/stories';
import { ASSETS } from '../content/assets';
import { useLanguage } from '../content/language';
import { X, Play, Pause, LogOut, ExternalLink, FastForward } from 'lucide-react';
import { MAX_SCORE, STORAGE_KEY } from '../constants';
import CharacterSprite from './CharacterSprite';
import GalleryView from './GalleryView';
import { CHAR_CONFIG } from '../content/spriteData';
import {
  AssetLoadProgress,
  getPreloadedAssetBuffer,
  preloadGameAssets,
  subscribeToAssetProgress,
} from '../services/assetPreloader';

interface GameState {
  score: number;
  unlockedIds: string[];
  hasSeenIntro: boolean;
  chaosModeActive: boolean; 
  gameCompleted: boolean; 
  pendingStoryId: string | null;
  storyLineIndex: number;
}

interface GameSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- SPRITE DEBUGGER DEFAULTS ---
interface SpritePosition {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  scale: number;
}

const DEFAULT_SPRITE_LAYOUT: Record<string, SpritePosition> = {
  "guitar_l": { x: 31.6, y: 56.8, scale: 0.36 },
  "bass": { x: 63, y: 54.6, scale: 0.35 },
  "guitar_r": { x: 40.2, y: 48.4, scale: 0.35 },
  "keyboard": { x: 58.6, y: 54.3, scale: 0.35 },
  "drums": { x: 50.6, y: 48.1, scale: 0.38 },
  "vocal": { x: 49.6, y: 52.4, scale: 0.35 }
};

// Particle Interface
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  driftX: number;
  driftY: number;
  size: number;
  mass: number; 
  type: 'star' | 'impurity' | 'spark';
  alpha: number;
  baseAlpha: number;
  phase: number;
  fadeFactor: number;
  life?: number;
}

// --- UTILITY COMPONENTS ---

interface TypewriterProps {
  text: string;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, delay = 0, speed = 30, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const initialLength = useRef(text.length);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Language changes only replace the displayed string. The current reveal and
  // completion timer continue; line changes mount a fresh keyed Typewriter.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      let index = 0;
      interval = setInterval(() => {
        index++;
        const next = Math.min(1, index / Math.max(1, initialLength.current));
        setProgress(next);
        if (next === 1) {
          clearInterval(interval);
          onCompleteRef.current?.();
        }
      }, speed);
    }, delay);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [delay, speed]);

  return <span>{text.slice(0, Math.ceil(text.length * progress))}</span>;
};

// --- EXTRACTED SUB-COMPONENTS ---

interface SyncProgressBarProps {
  score: number;
  hasPendingStory: boolean; 
  gameCompleted: boolean;
}

const SyncProgressBar: React.FC<SyncProgressBarProps> = React.memo(({ score, hasPendingStory, gameCompleted }) => {
  const { UI_TEXT, language } = useLanguage();
  const progress = Math.min(1, score / MAX_SCORE);
  const percentage = Math.floor(progress * 100);

  // Post-game style: Pure score tracking
  if (gameCompleted) {
      return (
        <div className="flex flex-col w-full max-w-md gap-2 opacity-50">
            <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-mono tracking-[0.2em] flex items-center gap-2 text-white font-bold">
                     {UI_TEXT.GAME.HEADER_CHAOS_LABEL}
                </span>
            </div>
            <div className="h-1 w-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white" style={{ width: '100%' }} />
            </div>
        </div>
      );
  }

  return (
      <div 
        className={`flex flex-col w-full max-w-md gap-2 relative transition-all duration-300 ${hasPendingStory ? 'scale-105' : ''}`}
      >
          <div className="flex justify-between items-end px-1">
              <span className={`text-[10px] font-mono tracking-[0.2em] flex items-center gap-2 transition-colors duration-300 ${hasPendingStory ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasPendingStory ? 'bg-yellow-400 animate-ping' : 'bg-green-500 animate-pulse'}`} />
                  {hasPendingStory ? ">>> LINK_ESTABLISHED <<<" : UI_TEXT.GAME.HEADER_PROGRESS_LABEL}
              </span>
              <span className={`text-xl font-mono tracking-widest leading-none ${hasPendingStory ? 'text-yellow-400' : 'text-white'}`}>
                  {percentage}<span className="text-xs opacity-50">%</span>
              </span>
          </div>

          <div className={`relative h-2 w-full overflow-hidden skew-x-[-15deg] border transition-all duration-300 ${hasPendingStory ? 'bg-yellow-900/40 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'bg-white/10 border-white/5'}`}>
              {hasPendingStory && (
                  <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(-45deg,transparent,transparent_5px,#facc15_5px,#facc15_10px)] animate-[scan_1s_linear_infinite]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,#000_2px)] bg-[size:10px_100%] opacity-20" />
              <motion.div 
                  className={`h-full relative ${hasPendingStory ? 'bg-yellow-400' : 'bg-white'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
              >
                  {!hasPendingStory && <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-400 shadow-[0_0_10px_#4ade80]" />}
              </motion.div>
          </div>
      </div>
  );
});

interface UnlockSignalOverlayProps {
  memberId: string;
  isHolding: boolean;
}

const UnlockSignalOverlay: React.FC<UnlockSignalOverlayProps> = ({ memberId, isHolding }) => {
  const { UI_TEXT, language } = useLanguage();
  const member = BAND_MEMBERS.find(item => item.id === memberId);
  if (!member) return null;
  const signalExpression = STORY_SCRIPTS[memberId]?.[0]?.expression || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        animate={{ opacity: isHolding ? 0.52 : 0.7 }}
      />

      {/* A signal is being recovered from noise, not presented as a conventional unlock card. */}
      <div className="absolute inset-0 opacity-35 mix-blend-screen bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(255,255,255,0.12)_4px)]" />
      <motion.div
        className="absolute h-[62vmin] w-[62vmin] rounded-full border border-white/20"
        animate={{
          scale: isHolding ? [0.86, 1.03, 0.9] : 1,
          opacity: isHolding ? [0.2, 0.7, 0.25] : 0.35,
          rotate: isHolding ? [0, 1.5, -1, 0] : 0,
        }}
        transition={{ duration: 0.32, repeat: isHolding ? Infinity : 0, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-[48vmin] w-[48vmin] rounded-full border border-dashed border-white/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ filter: 'grayscale(1) contrast(1.8) brightness(0.25)', opacity: 0 }}
        animate={{
          filter: isHolding
            ? 'grayscale(1) contrast(1.65) brightness(0.72)'
            : 'grayscale(1) contrast(1.9) brightness(0.42)',
          opacity: isHolding ? [0.18, 0.48, 0.25, 0.56] : 0.3,
          x: isHolding ? [0, -2, 1, 0] : 0,
        }}
        transition={{ duration: 0.42, repeat: isHolding ? Infinity : 0, ease: 'linear' }}
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 4%, black 24%, black 82%, transparent 98%)',
          maskImage: 'linear-gradient(to bottom, transparent 4%, black 24%, black 82%, transparent 98%)',
        }}
      >
        <div className="origin-center scale-[0.24] md:scale-[0.34]">
          <CharacterSprite charId={memberId} expression={signalExpression} />
        </div>
      </motion.div>

      <motion.div
        className="absolute left-0 right-0 h-px bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.95)]"
        animate={{ top: ['19%', '81%', '19%'], opacity: [0.1, 0.8, 0.1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="absolute bottom-[12%] left-6 right-6 flex flex-col items-center gap-4 text-center font-mono">
        <motion.div
          animate={{ opacity: [0.38, 1, 0.38] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="text-[10px] tracking-[0.42em] text-white/70 md:text-xs"
        >
          {language === 'en' ? 'HUMAN SIGNAL // RESOLVING' : '人形信号 // 正在解析'}
        </motion.div>
        <div className="h-px w-48 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <p className="max-w-xl text-xs tracking-[0.28em] text-white md:text-sm">
          {UI_TEXT.GAME.INSTRUCTION_RELEASE_STORY}
        </p>
      </div>
    </motion.div>
  );
};

interface IntroViewProps {
  onFinish: () => void;
}

const IntroView: React.FC<IntroViewProps> = ({ onFinish }) => {
  const { UI_TEXT, language } = useLanguage();
  const [assetProgress, setAssetProgress] = useState<AssetLoadProgress>({
    loadedBytes: 0,
    totalBytes: 0,
    completedFiles: 0,
    totalFiles: 0,
    percent: 0,
    failedUrls: [],
    done: false,
  });

  useEffect(() => {
    const unsubscribe = subscribeToAssetProgress(setAssetProgress);
    void preloadGameAssets();
    return unsubscribe;
  }, []);

  const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const canEnter = assetProgress.done;

  return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center font-mono z-50 px-6 text-center overflow-hidden">
          {/* Subtle Background Animation */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] md:w-[60vw] h-[140vw] md:h-[60vw] border border-white/10 rounded-full animate-[spin_60s_linear_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vw] md:w-[50vw] h-[110vw] md:h-[50vw] border border-dashed border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
          </div>

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-green-500/90 tracking-[0.2em] text-[10px] md:text-xs mb-12 md:mb-16 relative z-10">
              &gt; SYSTEM_BOOT: SEQUENCE_INIT
          </motion.div>

          <div className="min-h-[6rem] flex flex-col items-center justify-center gap-4 mb-20 md:mb-24 relative z-10">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white text-sm md:text-lg tracking-[0.2em] font-light leading-relaxed">
                  <Typewriter text={language === 'en' ? 'Faint resonance detected…' : '侦测到微弱共鸣……'} speed={50} />
             </motion.div>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-white text-sm md:text-lg tracking-[0.2em] font-light leading-relaxed text-gray-400">
                  <Typewriter text={language === 'en' ? 'Establishing a connection…' : '正在尝试建立连接……'} speed={50} delay={1500} />
             </motion.div>
          </div>
          
          <motion.div
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-7 relative z-10 w-full max-w-md"
          >
              <div className="w-full space-y-3 font-mono">
                  <div className="flex items-center justify-between text-[10px] md:text-xs tracking-[0.16em] text-gray-400">
                      <span>{language === 'en' ? 'DOWNLOADING ASSETS' : '正在下载素材'}</span>
                      <span className="text-white tabular-nums">{assetProgress.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden border border-white/20 bg-white/5">
                      <motion.div
                          className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                          animate={{ width: `${assetProgress.percent}%` }}
                          transition={{ duration: 0.15, ease: 'linear' }}
                      />
                  </div>
                  <div className="flex items-center justify-between text-[9px] tracking-[0.12em] text-gray-600">
                      <span>{assetProgress.completedFiles}/{assetProgress.totalFiles} FILES</span>
                      <span>
                          {formatSize(assetProgress.loadedBytes)}
                          {assetProgress.totalBytes > 0 ? ` / ${formatSize(assetProgress.totalBytes)}` : ''}
                      </span>
                  </div>
                  {assetProgress.done && assetProgress.failedUrls.length > 0 && (
                      <div className="flex items-center justify-between gap-4 text-[9px] tracking-[0.1em] text-yellow-500">
                          <span>
                              {language === 'en'
                                ? `${assetProgress.failedUrls.length} ASSET UNAVAILABLE`
                                : `${assetProgress.failedUrls.length} 个素材暂不可用`}
                          </span>
                          <button
                              type="button"
                              onClick={() => void preloadGameAssets(true)}
                              className="border-b border-yellow-500/60 hover:text-yellow-300"
                          >
                              {language === 'en' ? 'RETRY' : '重试'}
                          </button>
                      </div>
                  )}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6 }}>
                  {/* Enhanced Button */}
                  <button 
                      onClick={onFinish}
                      disabled={!canEnter}
                      className="group relative w-full md:w-auto px-12 py-4 overflow-hidden focus:outline-none disabled:cursor-wait disabled:opacity-35"
                  >
                      <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:via-white/80 transition-all duration-500" />
                      <span className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:via-white/80 transition-all duration-500" />
                      
                      <div className="relative flex items-center justify-center gap-3">
                          <span className="w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="text-xs md:text-sm font-mono tracking-[0.3em] text-white uppercase group-hover:tracking-[0.4em] transition-all duration-500 whitespace-nowrap">
                              {canEnter
                                ? UI_TEXT.GAME.SOUND_BUTTON
                                : (language === 'en' ? 'LOADING...' : '加载中……')}
                          </span>
                          <span className="w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                  </button>
              </motion.div>
          </motion.div>
      </div>
  );
};

interface EndingViewProps { onClose: () => void; }
const EndingView: React.FC<EndingViewProps> = ({ onClose }) => {
  const { language } = useLanguage();
  return (
    <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 bg-white z-[200] flex flex-col items-center justify-center text-black overflow-hidden"
    >
        {/* Decorative elements for "Cool" look */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] border-[1px] border-black rounded-full" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[1px] bg-black" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50vw] w-[1px] bg-black" />
        </div>

        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
        >
            <h1 className="text-5xl md:text-8xl font-light tracking-[0.2em] mb-4 text-center mix-blend-multiply">
                COLLAPSAR
            </h1>
        </motion.div>
        
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ delay: 2, duration: 1 }}
            className="h-px bg-black mb-12"
        />

        <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 2.5, duration: 1 }}
            className="text-xs md:text-sm font-mono tracking-[0.2em] px-6 text-center mb-24 uppercase text-gray-600"
        >
            {language === 'en' ? 'Concept Demo Complete' : '概念小游戏试玩结束'}
        </motion.p>
        
        <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 3, duration: 0.8 }}
            onClick={onClose} 
            className="group relative px-10 py-3 overflow-hidden"
        >
            {/* Elegant framing */}
            <span className="absolute inset-0 border border-black transform transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            
            <div className="relative z-10 flex items-center gap-3">
                 <span className="w-1.5 h-1.5 bg-black group-hover:bg-white rounded-full transition-colors duration-500" />
                 <span className="font-mono text-sm tracking-[0.3em] text-black group-hover:text-white transition-colors duration-500 font-bold">
                     {language === 'en' ? 'Confirm' : '确认'}
                 </span>
                 <span className="w-1.5 h-1.5 bg-black group-hover:bg-white rounded-full transition-colors duration-500" />
            </div>
        </motion.button>
    </motion.div>
);
};

// --- SPECIAL ED PLAYER (POST-GAME DEMO INTERFACE) ---

const ED_LYRICS = [
  { en: "Pull me from the edge before we stray.", cn: "在我们迷失前，将我从深渊边缘带回" },
  { en: "Don’t dissolve right in front of me.", cn: "不要在我面前消逝啊" },
  { en: "Give me the strength to trust and see.", cn: "赐予我力量，去笃信、去凝望" },
  { en: "Please say I’ll,", cn: "" },
  { en: "Please say I’ll,", cn: "" },
  { en: "Please say I’ll,", cn: "" },
  { en: "stay.", cn: "请说你将会长留此间" },
];

const EdPlayer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { UI_TEXT, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(ASSETS.AUDIO.ED);
    audioRef.current = audio;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    audioRef.current.currentTime = ratio * duration;
    setProgress(ratio * duration);
  };

  const formatTime = (t: number) => {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-[#050505] z-50 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-white/5 rounded-full blur-[100px] opacity-20 animate-pulse" />
        </div>

        <div className="w-full max-w-2xl flex flex-col items-center relative z-10 min-h-full justify-between gap-8 py-8 md:py-12">
            
            {/* Top: Title */}
            <div className="text-center space-y-2 mt-4">
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl md:text-3xl font-light text-white tracking-[0.2em]"
                >
                    Stray (Ending)
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs font-mono text-gray-500 tracking-[0.3em]"
                >
                    COLLAPSAR // ORIGINAL TRACK
                </motion.p>
            </div>

            {/* Middle: Lyrics (Compact for One Screen) */}
            <div className="flex-1 flex flex-col justify-center items-center gap-4 w-full select-none">
                {ED_LYRICS.map((line, i) => (
                    <motion.div 
                        key={i}
                        className="flex flex-col items-center gap-0.5 group cursor-default"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                    >
                        <motion.span 
                            className="text-base md:text-lg font-serif text-gray-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-500 text-center leading-tight"
                        >
                            {line.en}
                        </motion.span>
                        {language === 'zh' && line.cn && (
                            <span className="text-[10px] font-light text-gray-600 group-hover:text-gray-400 transition-colors duration-500 font-sans tracking-wide">
                                {line.cn}
                            </span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Bottom Section: Player & Footer */}
            <div className="w-full flex flex-col gap-8">
                {/* Elegant Player Controls (Horizontal) */}
                <div className="w-full flex items-center gap-6">
                    <motion.button
                        onClick={togglePlay}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 hover:border-white/50 transition-all duration-300 group shrink-0"
                    >
                        {isPlaying ? (
                            <Pause size={18} className="text-white fill-white opacity-80 group-hover:opacity-100" />
                        ) : (
                            <Play size={18} className="text-white fill-white opacity-80 group-hover:opacity-100 ml-1" />
                        )}
                    </motion.button>

                    <div className="flex-1 flex items-center gap-4 text-[10px] font-mono text-gray-400">
                        <span className="w-8 text-right">{formatTime(progress)}</span>
                        <div 
                        className="flex-1 h-6 flex items-center cursor-pointer group relative"
                        onClick={handleSeek}
                        >
                            <div className="w-full h-[1px] bg-white/10 group-hover:bg-white/20 transition-colors duration-300" />
                            <motion.div 
                                className="absolute left-0 h-[1px] bg-white shadow-[0_0_5px_white]"
                                style={{ width: `${(progress / duration) * 100}%` }}
                            />
                            <motion.div 
                                className="absolute w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_5px_white]"
                                style={{ left: `${(progress / duration) * 100}%`, transform: 'translateX(-50%)' }}
                            />
                        </div>
                        <span className="w-8">{formatTime(duration || 0)}</span>
                    </div>
                </div>

                {/* New Footer: Social Links & Return Button */}
                <div className="w-full flex flex-col items-center gap-6 pt-4 border-t border-white/5">
                    {/* Socials */}
                    <div className="flex gap-6 md:gap-8">
                         {SOCIAL_LINKS.map(link => (
                             <a 
                                 key={link.id} 
                                 href={link.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-[10px] font-mono tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1 group"
                             >
                                 {link.name}
                                 <ExternalLink size={10} className="opacity-50 group-hover:opacity-100" />
                             </a>
                         ))}
                    </div>
                    
                    {/* Return to Webpage Button */}
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-white/40 hover:text-white transition-colors py-2 px-4 rounded hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                        <LogOut size={12} />
                        {UI_TEXT.GAME.BACK_TO_INDEX.toUpperCase()}
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};

// --- STORY VIEW (Simplified) ---

interface StoryViewProps {
  scriptId: string;
  onStoryComplete: () => void;
  initialLineIndex?: number;
  onLineChange?: (lineIndex: number) => void;
  isOverlay?: boolean;
}

const StoryView: React.FC<StoryViewProps> = ({ scriptId, onStoryComplete, initialLineIndex = 0, onLineChange, isOverlay = false }) => {
  const { UI_TEXT, language } = useLanguage();
  const [lineIndex, setLineIndex] = useState(initialLineIndex);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  // Responsive Check for Desktop adjustments
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
      const handleResize = () => setIsDesktop(window.innerWidth >= 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const script = (language === 'en' ? STORIES_EN : STORY_SCRIPTS)[scriptId] || [];
  const currentLine = script[lineIndex];
  
  const displayMember = BAND_MEMBERS.find(m => m.id === (currentLine?.speakerId === 'self' || currentLine?.speakerId === 'system' ? scriptId : currentLine?.speakerId));

  // Determine layout position for the current speaker with Desktop adjustments
  const layout = useMemo(() => {
      if (!displayMember) return null;
      const base = DEFAULT_SPRITE_LAYOUT[displayMember.id] || { x: 50, y: 50, scale: 0.35 };
      
      if (isDesktop) {
          // Desktop: 15% larger scale, raised vertical position (lower y value)
          return {
              ...base,
              scale: base.scale * 1.15,
              y: base.y - 7 
          };
      }
      return base;
  }, [displayMember, isDesktop]);

  const handleNext = useCallback(() => {
      if (!isTypingComplete) return; 
      if (lineIndex < script.length - 1) {
          const nextLineIndex = lineIndex + 1;
          setLineIndex(nextLineIndex);
          onLineChange?.(nextLineIndex);
          setIsTypingComplete(false);
      } else {
          onStoryComplete();
      }
  }, [lineIndex, script.length, isTypingComplete, onLineChange, onStoryComplete]);

  if (!currentLine) return null; 

  return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`absolute inset-0 z-50 flex flex-col justify-end overflow-hidden ${isOverlay ? 'bg-transparent' : 'bg-black/80'}`}
        onClick={handleNext}
      >
          {displayMember && currentLine.speakerId !== 'system' && layout && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <motion.div 
                     key={currentLine.expression} 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     transition={{ duration: 0.4, ease: "easeOut" }}
                     style={{
                         position: 'absolute',
                         left: `${layout.x}%`,
                         top: `${layout.y}%`,
                         zIndex: 10
                     }}
                  >
                       <div style={{ 
                           transform: `translate(-50%, -50%) scale(${layout.scale})`, 
                           transformOrigin: 'center center' 
                       }}>
                            <CharacterSprite charId={displayMember.id} expression={currentLine.expression || ''} />
                       </div>
                  </motion.div>
              </div>
          )}
          
          <div className="relative z-10 p-4 md:p-12 w-full max-w-5xl mx-auto mb-4 md:mb-10 pointer-events-none max-h-full overflow-y-auto">
               <div className="pointer-events-auto">
                   {currentLine.speakerId !== 'system' && (
                       <div className="inline-block bg-white/10 backdrop-blur-md border-l-2 border-white px-4 py-1 mb-2">
                           <span className="text-sm font-mono tracking-widest uppercase" style={{ color: displayMember?.color || '#fff' }}>
                               {currentLine.speakerId === 'self' ? UI_TEXT.GAME.SPEAKER_SELF : <span className="flex items-center gap-2"><span className="opacity-50 text-[0.8em] font-bold">[{displayMember?.role}]</span>{language === 'en' ? MEMBER_NAMES[displayMember?.id || ''] : displayMember?.name}</span>}
                           </span>
                       </div>
                   )}
                   <div className={`border border-white/20 p-4 md:p-8 min-h-[112px] md:min-h-[160px] pb-10 relative backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer hover:border-white/40 transition-colors ${currentLine.speakerId === 'system' ? 'bg-red-900/40 border-red-500/50 text-center flex items-center justify-center' : 'bg-black/80'}`}>
                       <p
                           lang={language === 'en' ? 'en' : 'zh-CN'}
                           style={language === 'en' ? { fontFamily: "Georgia, 'Times New Roman', serif" } : undefined}
                           className={`text-lg md:text-2xl font-light leading-relaxed ${currentLine.speakerId === 'system' ? 'text-red-100 font-bold tracking-widest' : 'text-gray-100'}`}
                       >
                           <Typewriter key={lineIndex} text={currentLine.text} speed={30} onComplete={() => setIsTypingComplete(true)} />
                       </p>
                       {isTypingComplete && <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute bottom-4 right-4 text-white/50"><Play fill="currentColor" size={16} /></motion.div>}
                       <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/50" />
                       <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/50" />
                       <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/50" />
                       <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/50" />
                   </div>
               </div>
          </div>
      </motion.div>
  );
};

// --- MAIN GAME SYSTEM ---

const GameSystem: React.FC<GameSystemProps> = ({ isOpen, onClose }) => {
  const { UI_TEXT, language } = useLanguage();
  const [gameState, setGameState] = useState<GameState>({ score: 0, unlockedIds: [], hasSeenIntro: false, chaosModeActive: false, gameCompleted: false, pendingStoryId: null, storyLineIndex: 0 });
  const [view, setView] = useState<'INTRO' | 'GAME' | 'STORY' | 'ENDING' | 'DEMOS' | 'GALLERY'>('GAME');
  
  // notification/unlock state
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [signalHolding, setSignalHolding] = useState(false);
  
  const [showMovementHint, setShowMovementHint] = useState(false);

  // Audio Context Ref & Scheduling
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<{ [key: string]: GainNode }>({});
  const buffersRef = useRef<{ [key: string]: AudioBuffer }>({});
  const isAudioInitialized = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const audioTimelineStartRef = useRef(0);
  const scheduleTimerRef = useRef<number | null>(null);
  const loopIterationRef = useRef(0); // Track loop iterations for AABB logic
  
  // Audio Constants (110 BPM, 4 Bars)
  const BPM = 110;
  const BEATS_PER_BAR = 4;
  const BARS = 4;
  // Calculate exact duration of 4 bars in seconds: (60 / 110) * 4 * 4
  const LOOP_DURATION = (60 / BPM) * BEATS_PER_BAR * BARS; 

  // Canvas Logic Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const cursorRef = useRef({ x: 0, y: 0 });
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const movementHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holePosRef = useRef({ x: 0, y: 0 });
  const prevSizeRef = useRef({ w: 0, h: 0 });
  const scoreRef = useRef(0);
  
  // Sync Refs
  const unlockedIdsRef = useRef<string[]>([]);
  const isLevelCappedRef = useRef(false); 
  const maxParticlesRef = useRef(0); 
  const shakeRef = useRef(0); 
  const damageFlashRef = useRef(0); 
  const shockwaveTriggerRef = useRef(false); 
  const shockwaveVisualRef = useRef(0); 
  const gravityBeatPulseRef = useRef(0);
  const lastGravityBeatRef = useRef(-1);
  const holdStartedAtRef = useRef(0);
  
  // --- NEW MECHANICS REFS ---
  const impurityRateRef = useRef(0.05); 
  const absorbChaosModeRef = useRef(false); 
  const floorHitCountRef = useRef(0); // Track difficulty hits
  const gameCompletedRef = useRef(false);
  
  // PERSISTENT PARTICLES (Bug Fix for Reset)
  const particlesRef = useRef<Particle[]>([]);

  const scheduleMovementHint = useCallback(() => {
    if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
    movementHintTimerRef.current = setTimeout(() => setShowMovementHint(true), 7000);
  }, []);

  // --- 0. SCROLL LOCKING ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (scheduleTimerRef.current) {
          cancelAnimationFrame(scheduleTimerRef.current);
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
    setShowMovementHint(false);
    if (view === 'GAME' && gameState.unlockedIds.length === 0 && !justUnlocked) {
      scheduleMovementHint();
    }
    return () => {
      if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
    };
  }, [view, gameState.unlockedIds.length, justUnlocked, scheduleMovementHint]);

  // Removed useEffect for auto-transition. 
  // Now we wait for user release in handleEnd to trigger 'STORY'.

  // --- 1. PERSISTENCE & INIT ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const pendingStoryId = typeof parsed.pendingStoryId === 'string' && STORY_SCRIPTS[parsed.pendingStoryId]
          ? parsed.pendingStoryId
          : null;
        const pendingStoryLength = pendingStoryId ? STORY_SCRIPTS[pendingStoryId].length : 0;
        const restoredLineIndex = pendingStoryId
          ? Math.min(Math.max(0, parsed.storyLineIndex ?? 0), Math.max(0, pendingStoryLength - 1))
          : 0;
        const restoredState: GameState = {
          ...parsed,
          pendingStoryId,
          storyLineIndex: restoredLineIndex,
        };
        setGameState(restoredState);
        scoreRef.current = parsed.score || 0;
        unlockedIdsRef.current = parsed.unlockedIds || [];
        absorbChaosModeRef.current = parsed.chaosModeActive || false;
        gameCompletedRef.current = parsed.gameCompleted || false;
        
        // --- RESTORE DIFFICULTY / MECHANICS BASED ON PROGRESS ---
        const unlockedCount = (parsed.unlockedIds || []).length;
        
        // Impurity Rates mapped to script flow
        if (unlockedCount >= 1) impurityRateRef.current = 0.25; // After 77 (20%)
        if (unlockedCount >= 2) impurityRateRef.current = 0.30; // After Linan (30%)
        if (unlockedCount >= 3) impurityRateRef.current = 0.35; // After AS (50%) - Reduced from 0.60
        if (unlockedCount >= 4) impurityRateRef.current = 0.40; // After Weixiao (60%) - Reduced from 0.75
        if (unlockedCount >= 5) impurityRateRef.current = 0.45; // After Caicai (70%) - Reduced from 0.90
        if (unlockedCount >= 6) {
            impurityRateRef.current = 1.0;  // After Vocal (80%) -> Chaos Mode
            absorbChaosModeRef.current = true;
        }

        // Restore notification state
        const nextLocked = BAND_MEMBERS.find(m => !(parsed.unlockedIds || []).includes(m.id));
        if (nextLocked && (parsed.score || 0) >= nextLocked.unlockThreshold) {
             setJustUnlocked(nextLocked.id);
             isLevelCappedRef.current = true;
        }

        // Post-credits dialogue is currently disabled. Migrate saves that were
        // paused there directly into the completed Demo/Gallery state.
        if (restoredState.pendingStoryId === 'post_credits' && isOpen) {
            restoredState.pendingStoryId = null;
            restoredState.storyLineIndex = 0;
            restoredState.gameCompleted = true;
            restoredState.score = 0;
            setGameState(restoredState);
            gameCompletedRef.current = true;
            scoreRef.current = 0;
            setJustUnlocked(null);
            setView('DEMOS');
        } else if (restoredState.pendingStoryId && isOpen) {
            setJustUnlocked(restoredState.pendingStoryId);
            setView('STORY');
        } else if (parsed.hasSeenIntro && isOpen) {
            // Default view logic adjustment
            if (parsed.gameCompleted) {
                setView('DEMOS'); // Post-game defaults to DEMOS (EdPlayer)
            } else {
                setView('GAME');
            }
        } else if (isOpen) {
            setView('INTRO');
        }
      } catch (e) {
        console.error("Save file corrupted", e);
      }
    } else {
        if (isOpen) setView('INTRO');
    }
  }, [isOpen]);

  useEffect(() => {
    if (gameState.score !== undefined) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
    unlockedIdsRef.current = gameState.unlockedIds;
    absorbChaosModeRef.current = gameState.chaosModeActive;
    gameCompletedRef.current = gameState.gameCompleted;
  }, [gameState]);

  // --- 2. AUDIO ENGINE (Advanced Scheduler) ---
  
  // 2.1 Load Buffers
  const loadBuffers = async (ctx: AudioContext) => {
      const loadPromises = BAND_MEMBERS.map(async (member) => {
          if (!member.audioTrack) return;
          try {
              // Load Main Track
              const cachedBuffer = getPreloadedAssetBuffer(member.audioTrack);
              const response = cachedBuffer ? null : await fetch(member.audioTrack);
              const arrayBuffer = cachedBuffer ?? await response!.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              buffersRef.current[member.id] = audioBuffer;

              // Load Secondary Track if exists
              if (member.audioTrack2) {
                  const cachedBuffer2 = getPreloadedAssetBuffer(member.audioTrack2);
                  const r2 = cachedBuffer2 ? null : await fetch(member.audioTrack2);
                  const b2 = cachedBuffer2 ?? await r2!.arrayBuffer();
                  const ab2 = await ctx.decodeAudioData(b2);
                  buffersRef.current[`${member.id}_2`] = ab2;
              }
          } catch (e) {
              console.warn(`Failed to load audio for ${member.id}:`, e);
          }
      });
      await Promise.all(loadPromises);
  };

  // 2.2 Scheduler Loop
  const scheduler = useCallback(() => {
      if (!audioCtxRef.current) return;
      
      const ctx = audioCtxRef.current;
      // Schedule ahead: look 100ms into the future
      while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
          scheduleLoopPlayback(nextNoteTimeRef.current);
          nextNoteTimeRef.current += LOOP_DURATION;
      }
      
      scheduleTimerRef.current = requestAnimationFrame(scheduler);
  }, []);

  // 2.3 Playback Trigger
  const scheduleLoopPlayback = (time: number) => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const currentLoop = loopIterationRef.current;

      BAND_MEMBERS.forEach(member => {
          if (!member.audioTrack) return;
          let buffer = buffersRef.current[member.id];
          
          // Handle AABB pattern for secondary tracks
          if (member.audioTrack2) {
              const patternIndex = currentLoop % 4; // 0, 1, 2, 3
              // 0, 1 = First Track (A)
              // 2, 3 = Second Track (B)
              if (patternIndex >= 2) {
                  const buffer2 = buffersRef.current[`${member.id}_2`];
                  if (buffer2) {
                      buffer = buffer2;
                  }
              }
          }

          const gainNode = gainNodesRef.current[member.id];
          
          if (buffer && gainNode) {
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(gainNode);
              // Start exactly at the scheduled time
              source.start(time);
              // Do NOT use loop = true. We are manually triggering loops to allow overlapping tails.
              // The audio will play to the end of its buffer (tail included).
          }
      });

      // Increment loop counter
      loopIterationRef.current += 1;
  };

  const initAudio = useCallback(async () => {
    if (isAudioInitialized.current) return;

    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.connect(ctx.destination);

      // Setup Gain Nodes
      BAND_MEMBERS.forEach(member => {
        // Gain (Volume)
        const gain = ctx.createGain();
        gain.gain.value = 0; // Default to 0
        gain.connect(compressor);
        gainNodesRef.current[member.id] = gain;
      });

      // Load Buffers
      await loadBuffers(ctx);
      
      // Initialize Scheduler Time
      nextNoteTimeRef.current = ctx.currentTime + 0.1;
      audioTimelineStartRef.current = nextNoteTimeRef.current;
      lastGravityBeatRef.current = -1;
      
      // Start Scheduler
      scheduler();

      // updateAudioVolumes(gameState.unlockedIds); // We will use realtime update loop instead
      isAudioInitialized.current = true;
    } catch (e) {
      console.error("Audio init failed", e);
    }
  }, [gameState.unlockedIds, scheduler]);

  // --- AUDIO DYNAMICS UPDATE ---
  const updateAudioRealtime = () => {
      if (!audioCtxRef.current || !isAudioInitialized.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Special Case: During Post-Credits Story (FADE OUT as requested)
      if (view === 'STORY' && justUnlocked === 'post_credits') {
          BAND_MEMBERS.forEach(member => {
              const gainNode = gainNodesRef.current[member.id];
              if (gainNode) {
                   // Fade out over 0.5 seconds
                   gainNode.gain.setTargetAtTime(0, now, 0.5); 
              }
          });
          return;
      }
      
      // New: Fade out if in DEMOS view
      if (view === 'DEMOS' || view === 'GALLERY') {
          BAND_MEMBERS.forEach(member => {
              const gainNode = gainNodesRef.current[member.id];
              if (gainNode) {
                  gainNode.gain.setTargetAtTime(0, now, 0.5); 
              }
          });
          return;
      }
      
      // DO NOT fade out if view is ENDING. Music continues during whiteout.

      BAND_MEMBERS.forEach((member, index) => {
          const gainNode = gainNodesRef.current[member.id];
          if (!gainNode) return;

          const isUnlocked = unlockedIdsRef.current.includes(member.id);
          // Check if currently unlocking (in story mode)
          const isUnlocking = (justUnlocked === member.id && view === 'STORY');

          if (isUnlocked || isUnlocking) {
              // --- SCENARIO A: UNLOCKED OR UNLOCKING ---
              // Volume: 100% (1.0)
              gainNode.gain.setTargetAtTime(1.0, now, 0.1);
          } else {
              // --- SCENARIO B: LOCKED / APPROACHING ---
              
              // 1. Calculate Score Progress for this specific member
              const prevThreshold = index === 0 ? 0 : BAND_MEMBERS[index - 1].unlockThreshold;
              const nextThreshold = member.unlockThreshold;
              const currentScore = scoreRef.current;

              // If we haven't reached the previous member's cap, this track should be silent
              if (currentScore < prevThreshold) {
                   // [MODIFIED] Ensure first track (Guitar L) has min volume of 0.3 even at start
                   if (index === 0) {
                        gainNode.gain.setTargetAtTime(0.6, now, 0.1);
                   } else {
                        gainNode.gain.setTargetAtTime(0, now, 0.1);
                   }
                   return;
              }

              // Calculate progress (0.0 to 1.0) within this level
              const rawProgress = (currentScore - prevThreshold) / (nextThreshold - prevThreshold);
              const progress = Math.max(0, Math.min(1, rawProgress));

              // 2. Map Progress to Volume
              // Apply squared curve for smoother fade-in (especially for lead guitar)
              const volCurve = Math.pow(progress, 2);
              const targetGain = volCurve * 0.6;
              gainNode.gain.setTargetAtTime(targetGain, now, 0.1);
          }
      });
  };

  // --- 3. GAME VISUALS (CANVAS) ---
  useEffect(() => {
    if (!isOpen || (view !== 'GAME' && view !== 'ENDING' && view !== 'STORY')) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return;
    }
    
    // Resume context on interaction (handled in handleStart), but ensure init is called
    if (!isAudioInitialized.current) initAudio();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particle coordinates are kept in CSS pixels. The canvas backing store may
    // be larger on high-DPI screens, but the context transform below keeps all
    // drawing and pointer maths in the same (CSS pixel) coordinate system.
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    // Handle Resize with SMOOTH TRANSITION (Scaling)
    const updateDimensions = () => {
        const rect = canvas.getBoundingClientRect();
        const newWidth = Math.round(rect.width);
        const newHeight = Math.round(rect.height);

        // During navigation the canvas can briefly have no layout box. Writing
        // the viewport size in that state leaves its intrinsic aspect ratio out
        // of sync with the box once it becomes visible, which squashes particles.
        if (newWidth <= 0 || newHeight <= 0) return;

        const nextPixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const sizeChanged = newWidth !== width || newHeight !== height;
        const backingStoreChanged =
            canvas.width !== Math.round(newWidth * nextPixelRatio) ||
            canvas.height !== Math.round(newHeight * nextPixelRatio);

        if (!sizeChanged && !backingStoreChanged && nextPixelRatio === pixelRatio) return;
        
        // Scale existing particles instead of resetting
        if (prevSizeRef.current.w > 0 && prevSizeRef.current.h > 0) {
            const scaleX = newWidth / prevSizeRef.current.w;
            const scaleY = newHeight / prevSizeRef.current.h;
            
            // Adjust particles
            particlesRef.current.forEach(p => {
                p.x *= scaleX;
                p.y *= scaleY;
            });
            
            // Adjust Black Hole Position
            holePosRef.current.x *= scaleX;
            holePosRef.current.y *= scaleY;
        } else {
            // First time init: center black hole
            if (holePosRef.current.x === 0 && holePosRef.current.y === 0) {
                 holePosRef.current = { x: newWidth / 2, y: newHeight / 2 };
                 cursorRef.current = { x: newWidth / 2, y: newHeight / 2 };
            }
        }
        
        width = newWidth;
        height = newHeight;
        pixelRatio = nextPixelRatio;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        
        prevSizeRef.current = { w: width, h: height };

        // Recalculate max particles on resize to ensure density is maintained
        const area = width * height;
        const densityDivisor = 15000;
        const count = Math.min(Math.max(Math.floor(area / densityDivisor), 30), 120);
        maxParticlesRef.current = count;
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.visualViewport?.addEventListener('resize', updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(canvas);

    // --- Particle System Logic ---
    const createParticle = (w: number, h: number, shouldFadeIn: boolean = false): Particle => {
        // Updated Impurity Logic
        let currentImpurityRate = impurityRateRef.current;
        
        // Dynamic Difficulty Adjustment for Final Stage
        if (unlockedIdsRef.current.length === 5 && floorHitCountRef.current >= 4) {
             const reductionSteps = floorHitCountRef.current - 3; 
             const reductionMultiplier = Math.max(0.2, 1 - (reductionSteps * 0.1)); 
             currentImpurityRate *= reductionMultiplier;
        }

        const isImpurity = Math.random() < currentImpurityRate; 
        
        const mass = isImpurity ? 0.5 : 3.0;
        // While the player is holding, never generate a new hazard inside the
        // reaction buffer around the current gravity centre. Rejection sampling
        // keeps distribution natural; the fallback projects the particle outward
        // for very small screens where a valid random point can be hard to find.
        const safeRadius = Math.min(w < 768 ? 132 : 180, Math.min(w, h) * 0.34);
        let startX = Math.random() * w;
        let startY = Math.random() * h;
        if (isImpurity && isHoldingRef.current) {
            const pointer = cursorRef.current;
            let attempts = 0;
            while (Math.hypot(startX - pointer.x, startY - pointer.y) < safeRadius && attempts < 16) {
                startX = Math.random() * w;
                startY = Math.random() * h;
                attempts += 1;
            }
            if (Math.hypot(startX - pointer.x, startY - pointer.y) < safeRadius) {
                const angle = Math.random() * Math.PI * 2;
                startX = Math.max(0, Math.min(w, pointer.x + Math.cos(angle) * safeRadius));
                startY = Math.max(0, Math.min(h, pointer.y + Math.sin(angle) * safeRadius));
            }
        }
        const baseAlpha = isImpurity ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4 + 0.2;

        return {
            x: startX, y: startY, vx: 0, vy: 0,
            driftX: (Math.random() - 0.5) * 0.5, 
            driftY: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + (isImpurity ? 4 : 2), 
            mass: mass,
            type: isImpurity ? 'impurity' : 'star',
            alpha: Math.random(), baseAlpha: baseAlpha,
            phase: Math.random() * Math.PI * 2,
            fadeFactor: shouldFadeIn ? 0 : 1,
        };
    };

    const createSparks = (x: number, y: number, count: number) => {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                driftX: 0, driftY: 0, size: Math.random() * 2 + 1, mass: 1, type: 'spark',
                alpha: 1, baseAlpha: 1, phase: 0, fadeFactor: 1, life: 1.0
            });
        }
    };

    const initParticles = () => {
      // Force clear to ensure fresh generation based on current valid dimensions
      const targetCount = maxParticlesRef.current;
      const currentCount = particlesRef.current.length;
      
      // Logic changed: Only populate if empty or insufficient, preventing reset on state updates
      if (currentCount === 0) {
         for (let i = 0; i < targetCount; i++) particlesRef.current.push(createParticle(width, height, false)); 
      } else if (currentCount < targetCount) {
         // Add missing particles smoothly
         const needed = targetCount - currentCount;
         for (let i = 0; i < needed; i++) particlesRef.current.push(createParticle(width, height, true));
      }
    };

    initParticles();

    let scoreAccumulator = 0;

    const loop = () => {
        // --- 1. Audio Realtime Updates (EQ & Volume) ---
        updateAudioRealtime();

        // --- DYNAMIC PARTICLE DENSITY (POST-GAME) ---
        if (gameCompletedRef.current) {
            // Scale particles based on score (starting from 0)
            // Example: 0 score -> 30 particles. 2000 score -> ~130 particles.
            const densityRatio = Math.min(scoreRef.current / MAX_SCORE, 1.5);
            const baseCount = 30;
            const scalingFactor = 100;
            const calculatedMax = baseCount + Math.floor(densityRatio * scalingFactor);
            maxParticlesRef.current = Math.min(calculatedMax, 400); // Hard cap for performance
        }

        const dxHole = cursorRef.current.x - holePosRef.current.x;
        const dyHole = cursorRef.current.y - holePosRef.current.y;
        holePosRef.current.x += dxHole * 0.15; 
        holePosRef.current.y += dyHole * 0.15;
        const hx = holePosRef.current.x;
        const hy = holePosRef.current.y;

        // The visual pulse shares the exact Web Audio clock used to schedule the
        // four-bar loop. It therefore follows the musical grid without relying on
        // frame timing or probabilistic waveform detection. Accents 1 and 3 are
        // stronger, matching the kick/snare backbone of the 4/4 drum stem.
        const audioCtx = audioCtxRef.current;
        const drumsActive = unlockedIdsRef.current.includes('drums');
        if (audioCtx && drumsActive && audioTimelineStartRef.current > 0) {
            const beatDuration = 60 / BPM;
            const elapsed = audioCtx.currentTime - audioTimelineStartRef.current;
            if (elapsed >= 0) {
                const absoluteBeat = Math.floor(elapsed / beatDuration);
                if (absoluteBeat !== lastGravityBeatRef.current) {
                    lastGravityBeatRef.current = absoluteBeat;
                    const beatInBar = absoluteBeat % BEATS_PER_BAR;
                    gravityBeatPulseRef.current = beatInBar === 0 ? 1 : beatInBar === 2 ? 0.72 : 0.42;
                }
            }
        }
        gravityBeatPulseRef.current *= 0.82;
        if (gravityBeatPulseRef.current < 0.01) gravityBeatPulseRef.current = 0;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        if (shakeRef.current > 0) {
            const shakeX = (Math.random() - 0.5) * shakeRef.current;
            const shakeY = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(shakeX, shakeY);
            shakeRef.current *= 0.9;
            if (shakeRef.current < 0.5) shakeRef.current = 0;
        }

        const friction = isHoldingRef.current ? 0.98 : 0.90;
        
        if (shockwaveTriggerRef.current) {
            shockwaveTriggerRef.current = false; 
            shockwaveVisualRef.current = 1; 
        }
        
        // --- SCORE FLOOR CALCULATION ---
        let currentScoreFloor = 0;
        if (unlockedIdsRef.current.length > 0) {
            const unlocked = BAND_MEMBERS.filter(m => unlockedIdsRef.current.includes(m.id));
            if (unlocked.length > 0) {
                currentScoreFloor = Math.max(...unlocked.map(m => m.unlockThreshold));
            }
        }
        
        // --- MOBILE SCORE MULTIPLIER ---
        const isMobile = width < 768; 
        const scoreMultiplier = isMobile ? 2 : 1;

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            if (p.type === 'spark' && p.life !== undefined) {
                p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; p.life -= 0.03; p.alpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 220, 100, ${p.alpha})`; 
                ctx.fill();
                if (p.life <= 0) particlesRef.current.splice(i, 1);
                continue;
            }

            const dx = hx - p.x;
            const dy = hy - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 0.1; 
            const nx = dx / dist; const ny = dy / dist;

            if (isHoldingRef.current) {
                const safeDist = Math.max(dist, 50); 
                const force = 2000 / (safeDist * safeDist); 
                p.vx += nx * force / p.mass; p.vy += ny * force / p.mass;
            }

            if (shockwaveVisualRef.current === 1) { 
                const blastRadius = 450;
                const forceFactor = Math.max(0, 1 - (dist / blastRadius));
                if (forceFactor > 0) {
                    const blastStrength = 40 * forceFactor; 
                    p.vx -= nx * blastStrength / p.mass;
                    p.vy -= ny * blastStrength / p.mass;
                }
            }
            
            p.vx *= friction; p.vy *= friction; p.x += p.vx + p.driftX; p.y += p.vy + p.driftY;

            if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) {
                particlesRef.current.splice(i, 1); continue; 
            }

            p.phase += 0.05;
            if (p.fadeFactor < 1) { p.fadeFactor += 0.015; if (p.fadeFactor > 1) p.fadeFactor = 1; }
            let baseCalculated = p.baseAlpha + Math.sin(p.phase) * (p.type === 'impurity' ? 0.05 : 0.15);
            if (baseCalculated < 0) baseCalculated = 0;
            p.alpha = baseCalculated * p.fadeFactor;

            const killRadius = 30; 
            if (isHoldingRef.current && dist < killRadius && p.fadeFactor > 0.5) { 
                // --- COLLISION LOGIC ---
                if (p.type === 'star') {
                    if (isLevelCappedRef.current && !gameCompletedRef.current) {
                        createSparks(p.x, p.y, 5);
                        particlesRef.current[i] = createParticle(width, height, true);
                    } else {
                        scoreRef.current = Math.min(scoreRef.current + (10 * scoreMultiplier), gameCompletedRef.current ? Infinity : MAX_SCORE);
                        scoreAccumulator++;
                        particlesRef.current[i] = createParticle(width, height, true);
                    }
                } else {
                    // IMPURITY LOGIC
                    // A brief grace window prevents an already nearby impurity
                    // from punishing the player before they can react to the press.
                    if (performance.now() - holdStartedAtRef.current < 520) {
                        const push = 8;
                        p.vx -= nx * push;
                        p.vy -= ny * push;
                        continue;
                    }
                    if (absorbChaosModeRef.current) {
                        // THE TWIST: Absorbing impurity ADDS score in Chaos Mode
                        // Buffed: Impurity score increased by 3x (2 * 3 = 6)
                        const chaosScoreIncrement = 6 * scoreMultiplier; 

                        createSparks(p.x, p.y, 10); // More sparks for chaos!
                        if (isLevelCappedRef.current && !gameCompletedRef.current) {
                             particlesRef.current[i] = createParticle(width, height, true);
                        } else {
                             // Slower score gain in chaos mode
                             scoreRef.current = Math.min(scoreRef.current + chaosScoreIncrement, gameCompletedRef.current ? Infinity : MAX_SCORE);
                             scoreAccumulator++;
                             particlesRef.current[i] = createParticle(width, height, true);
                        }
                    } else {
                        // Standard Logic: Damage with Floor Lock
                        const penalty = 50; // Deduction remains constant (not multiplied)
                        const potentialScore = scoreRef.current - penalty;
                        
                        // Check if hitting progress lock (floor)
                        if (unlockedIdsRef.current.length === 5 && potentialScore <= currentScoreFloor && scoreRef.current > currentScoreFloor) {
                            floorHitCountRef.current += 1;
                        }

                        // Apply floor: cannot drop below current floor
                        scoreRef.current = Math.max(potentialScore, currentScoreFloor);
                        
                        shakeRef.current = 20;
                        damageFlashRef.current = 0.5;
                        particlesRef.current[i] = createParticle(width, height, true);
                        scoreAccumulator++; 
                    }
                }
                continue; 
            }

            if (p.alpha > 0.01) {
                ctx.beginPath();
                if (p.type === 'impurity') {
                    // Impurity (Triangle/Shard)
                    ctx.moveTo(p.x, p.y - p.size * 1.5);
                    ctx.lineTo(p.x + p.size * 1.5, p.y);
                    ctx.lineTo(p.x, p.y + p.size * 1.5);
                    ctx.lineTo(p.x - p.size * 1.5, p.y);
                    ctx.fillStyle = `rgba(255, 80, 80, ${p.alpha})`;
                    ctx.shadowBlur = 25 * p.alpha; ctx.shadowColor = `rgba(255, 0, 0, ${p.alpha})`;
                } else {
                    // Star (Circle)
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(220, 230, 255, ${p.alpha})`;
                    if (isLevelCappedRef.current) {
                        ctx.shadowBlur = 10 * p.alpha; ctx.shadowColor = `rgba(255, 255, 200, ${p.alpha})`;
                    }
                }
                ctx.fill(); ctx.shadowBlur = 0; 
            }
        }

        if (particlesRef.current.length < maxParticlesRef.current) {
            const needed = maxParticlesRef.current - particlesRef.current.length;
            const spawnCount = Math.min(needed, 1); 
            for(let k = 0; k < spawnCount; k++) particlesRef.current.push(createParticle(width, height, true)); 
        }

        if (shockwaveVisualRef.current > 0) {
            ctx.beginPath();
            ctx.arc(hx, hy, shockwaveVisualRef.current, 0, Math.PI * 2);
            const alpha = Math.max(0, 1 - (shockwaveVisualRef.current / 400));
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 2 + (1 - alpha) * 10;
            ctx.stroke();
            shockwaveVisualRef.current += 10; 
            if (shockwaveVisualRef.current > 400) shockwaveVisualRef.current = 0;
        }

        const baseRadius = 20;
        const pulse = Math.sin(Date.now() * 0.008) * 2;
        const coreStrokeColor = isLevelCappedRef.current ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)';
        const holdStrokeColor = isLevelCappedRef.current ? 'rgba(255, 215, 0, 1)' : 'rgba(255, 255, 255, 1)';

        if (isHoldingRef.current) {
            const beatPulse = gravityBeatPulseRef.current;
            const edgeRadius = 450 + beatPulse * 7;
            ctx.beginPath();
            if (beatPulse > 0.01) {
                const segments = 96;
                for (let segment = 0; segment <= segments; segment++) {
                    const angle = (segment / segments) * Math.PI * 2;
                    const vibration = Math.sin(angle * 18 + performance.now() * 0.045) * beatPulse * 3.5;
                    const radius = edgeRadius + vibration;
                    const x = hx + Math.cos(angle) * radius;
                    const y = hy + Math.sin(angle) * radius;
                    if (segment === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
            } else {
                ctx.arc(hx, hy, edgeRadius, 0, Math.PI * 2);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; ctx.lineWidth = 1; ctx.stroke();
            if (beatPulse > 0.01) {
                ctx.beginPath(); ctx.arc(hx, hy, edgeRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + beatPulse * 0.12})`;
                ctx.lineWidth = 1 + beatPulse * 1.5;
                ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(hx, hy, baseRadius + 10 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = coreStrokeColor; ctx.lineWidth = 1; ctx.stroke();
        }

        ctx.beginPath(); ctx.arc(hx, hy, baseRadius + (isHoldingRef.current ? 4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = '#000000'; ctx.fill();
        ctx.strokeStyle = isHoldingRef.current ? holdStrokeColor : 'rgba(120, 120, 120, 0.5)';
        ctx.lineWidth = isHoldingRef.current ? 3 : 2; ctx.stroke();

        if (damageFlashRef.current > 0.01) {
            ctx.fillStyle = `rgba(255, 0, 0, ${damageFlashRef.current})`;
            ctx.fillRect(-50, -50, width + 100, height + 100);
            damageFlashRef.current *= 0.9;
        }
        
        // --- OVEREXPOSURE ENDING EFFECT ---
        // TRIGGER ENDING DIRECTLY, NO WHITE FADE LOGIC
        if (!gameCompletedRef.current && scoreRef.current >= MAX_SCORE) {
             // Fix: Do not force ENDING if we are already in STORY mode (post-credits)
             if (view !== 'ENDING' && view !== 'STORY') {
                 setView('ENDING');
             }
        }

        ctx.restore(); 

        if (scoreAccumulator > 0) {
             handleScoreUpdate(scoreRef.current);
             scoreAccumulator = 0;
        }
        
        requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
        window.removeEventListener('resize', updateDimensions);
        window.visualViewport?.removeEventListener('resize', updateDimensions);
        resizeObserver.disconnect();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isOpen, view, justUnlocked]); 

  // Handle Score Logic & Unlocking
  const handleScoreUpdate = (newScore: number) => {
      setGameState(prev => {
          if (prev.score === newScore) return prev; 
          
          const newUnlockedIds = [...prev.unlockedIds];
          let pendingNotificationId: string | null = justUnlocked; 
          let isLocked = isLevelCappedRef.current;

          // Only unlock regular members if game is not completed
          if (!prev.gameCompleted) {
              BAND_MEMBERS.forEach(m => {
                  if (!newUnlockedIds.includes(m.id) && newScore >= m.unlockThreshold) {
                      pendingNotificationId = m.id; 
                      isLocked = true; 
                  }
              });
          }

          unlockedIdsRef.current = newUnlockedIds;
          isLevelCappedRef.current = isLocked;

          if (pendingNotificationId && pendingNotificationId !== justUnlocked) {
              setJustUnlocked(pendingNotificationId);
          }
          return { ...prev, score: newScore, unlockedIds: newUnlockedIds };
      });
  };

  // Handle View Switching (Unlocking the cap)
  const handleSwitchView = (newView: 'INTRO' | 'GAME' | 'STORY' | 'DEMOS' | 'GALLERY') => {
      // RESET SCORE IF SWITCHING TO GAME IN POST-GAME MODE (though button should be hidden)
      if (newView === 'GAME' && gameCompletedRef.current) {
          // Prevent switching to game if completed
          return;
      }
      
      setView(newView);
  };
  
  // Handlers for child component callbacks
  const handleIntroComplete = useCallback(() => {
      setGameState(prev => ({ ...prev, hasSeenIntro: true }));
      setView('GAME');
  }, []);

  const handleEndingClose = useCallback(() => {
      // Post-credits dialogue is intentionally bypassed for now. Completing the
      // ending opens the Demo/Gallery section immediately.
      setGameState(prev => ({
          ...prev,
          gameCompleted: true,
          score: 0,
          pendingStoryId: null,
          storyLineIndex: 0,
      }));
      gameCompletedRef.current = true;
      absorbChaosModeRef.current = true;
      impurityRateRef.current = 1.0;
      scoreRef.current = 0;
      setJustUnlocked(null);
      setView('DEMOS');
  }, []);

  // 作弊通关：直接解锁全员并进入通关后界面 (DEMOS / 原创曲及画廊)
  const handleCheatComplete = useCallback(() => {
      const allMemberIds = BAND_MEMBERS.map(m => m.id);
      setGameState(prev => ({
          ...prev,
          hasSeenIntro: true,
          gameCompleted: true,
          unlockedIds: allMemberIds,
          score: 0,
          chaosModeActive: true,
          pendingStoryId: null,
          storyLineIndex: 0,
      }));
      gameCompletedRef.current = true;
      absorbChaosModeRef.current = true;
      impurityRateRef.current = 1.0;
      scoreRef.current = 0;
      unlockedIdsRef.current = allMemberIds;
      setJustUnlocked(null);
      setView('DEMOS');
  }, []);

  const handleStoryLineChange = useCallback((lineIndex: number) => {
      setGameState(prev => ({
          ...prev,
          pendingStoryId: justUnlocked,
          storyLineIndex: lineIndex,
      }));
  }, [justUnlocked]);

  const handleStoryComplete = useCallback(() => {
      // Handle completion of Post-Credits story specifically
      if (justUnlocked === 'post_credits') {
          // NOW set Game Completed and reset state for infinite mode
          setGameState(prev => ({ ...prev, gameCompleted: true, score: 0, pendingStoryId: null, storyLineIndex: 0 }));
          gameCompletedRef.current = true;
          absorbChaosModeRef.current = true; // Ensure chaos mode stays on
          impurityRateRef.current = 1.0; // Max impurity for post-game
          scoreRef.current = 0; // Reset score for new run
          
          setJustUnlocked(null);
          setView('DEMOS'); // DEFAULT TO DEMOS POST-GAME
          return;
      }

      setGameState(prev => {
          const newUnlocked = [...prev.unlockedIds];
          if (justUnlocked && !newUnlocked.includes(justUnlocked)) {
              newUnlocked.push(justUnlocked);
          }
          
          let nextChaosMode = prev.chaosModeActive;
          
          // --- LOGIC: UPDATE GAME MECHANICS BASED ON UNLOCKED MEMBER ---
          const count = newUnlocked.length;
          // Ramp up impurity rate as per design
          if (count === 1) impurityRateRef.current = 0.25; 
          if (count === 2) impurityRateRef.current = 0.30; 
          if (count === 3) impurityRateRef.current = 0.35; 
          if (count === 4) impurityRateRef.current = 0.40; 
          if (count === 5) impurityRateRef.current = 0.50; 
          
          // THE TWIST PART 1: After unlocking Vocal (Now includes the chaos lines)
          if (justUnlocked === 'vocal') {
              impurityRateRef.current = 1.00; // 100% Impurity
              // To ensure "resonance particles" (stars) quantity doesn't drop due to impurity influx, 
              // we bump the max particles slightly so the new impurities are additive.
              maxParticlesRef.current = Math.floor(maxParticlesRef.current * 1.5);
              nextChaosMode = true; 
              absorbChaosModeRef.current = true;
          }

          return { ...prev, unlockedIds: newUnlocked, chaosModeActive: nextChaosMode, pendingStoryId: null, storyLineIndex: 0 };
      });
      
      const newUnlockedList = [...gameState.unlockedIds];
      if (justUnlocked && !newUnlockedList.includes(justUnlocked)) {
           newUnlockedList.push(justUnlocked);
      }
      
      // Force Audio update for unlocked status occurs naturally in loop(), but we ensure state is sync
      unlockedIdsRef.current = newUnlockedList;
      
      // Reset Difficulty Counter on Level Up
      floorHitCountRef.current = 0;

      setJustUnlocked(null);
      isLevelCappedRef.current = false;
      setView('GAME'); // Always return to game for smoother flow
  }, [gameState.unlockedIds, justUnlocked]);

  // --- INTERACTION HANDLERS ---
  const updateCursorPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      // Optimization: Stop updating cursor logic if not in active GAME view
      if (view !== 'GAME') return;

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let clientX, clientY;

      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      cursorRef.current = { x, y };

      const previous = lastPointerPositionRef.current;
      if (previous && Math.hypot(x - previous.x, y - previous.y) > 8) {
          if (isHoldingRef.current) {
              setShowMovementHint(false);
              if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
          } else if (!showMovementHint) {
              scheduleMovementHint();
          }
      }
      lastPointerPositionRef.current = { x, y };

  }, [justUnlocked, view, showMovementHint, scheduleMovementHint]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      // If in Story Overlay mode, do not process physics interactions
      if (view === 'STORY') return;

      isHoldingRef.current = true;
      holdStartedAtRef.current = performance.now();
      setSignalHolding(true);
      lastPointerPositionRef.current = null;
      if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
      movementHintTimerRef.current = setTimeout(() => {
          if (isHoldingRef.current) setShowMovementHint(true);
      }, 7000);
      
      updateCursorPosition(e);
      
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  }, [updateCursorPosition, view]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      updateCursorPosition(e);
  }, [updateCursorPosition]);

  const handleEnd = useCallback(() => {
      if (isHoldingRef.current) {
          isHoldingRef.current = false;
          shockwaveTriggerRef.current = true;
      }
      setSignalHolding(false);
      if (movementHintTimerRef.current) clearTimeout(movementHintTimerRef.current);
      if (!justUnlocked) scheduleMovementHint();
      
      // TRIGGER STORY ON RELEASE
      if (justUnlocked) {
          setGameState(prev => ({ ...prev, pendingStoryId: justUnlocked, storyLineIndex: 0 }));
          setView('STORY');
      }
  }, [justUnlocked, scheduleMovementHint]);

  // --- RENDER ---
  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col select-none">
        {/* Global controls stay available above intro, story and ending overlays. */}
        <div className="absolute right-6 top-6 z-[300] flex items-center gap-4">
            {!gameState.gameCompleted && (
                <button
                    type="button"
                    onClick={handleCheatComplete}
                    title={language === 'zh' ? '作弊：直接通关' : 'Cheat: Direct Clear'}
                    aria-label={language === 'zh' ? '作弊：直接通关' : 'Cheat: Direct Clear'}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/20 bg-white/5 text-[11px] font-mono tracking-widest text-amber-400/90 hover:text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/10 transition-all shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                >
                    <FastForward size={14} />
                    <span className="hidden sm:inline">{language === 'zh' ? '作弊通关' : 'CHEAT CLEAR'}</span>
                </button>
            )}
            <LanguageSwitch />
            <button type="button" onClick={onClose} aria-label={language === 'zh' ? '退出游戏' : 'Exit game'} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
        {/* ENDING OVERLAY */}
        {view === 'ENDING' && <EndingView onClose={handleEndingClose} />}

        {/* HEADER */}
        <div className="h-36 md:h-24 border-b border-white/10 flex justify-between items-center px-6 pt-16 md:pt-0 bg-[#050505] relative z-20 shrink-0 gap-3 md:pr-52">
            <div className="flex-1 flex justify-start">
              {/* Only show progress if game not completed, or if wanted to show chaos score. */}
              {/* If gameCompleted, EdPlayer is shown fullscreen usually, but header remains. */}
              <SyncProgressBar 
                  score={gameState.score} 
                  hasPendingStory={!!justUnlocked} 
                  gameCompleted={gameState.gameCompleted} 
              />
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 relative overflow-hidden bg-black">
            {view === 'INTRO' && <IntroView onFinish={handleIntroComplete} />}
            {/* DEMOS view now renders the enhanced ED Player */}
            {view === 'DEMOS' && <EdPlayer onClose={onClose} />}
            {view === 'GALLERY' && gameState.gameCompleted && <GalleryView />}
            
            {/* Story View Overlay - Renders ON TOP of game when active */}
            {view === 'STORY' && (
                <StoryView 
                    key={justUnlocked || 'story'}
                    scriptId={justUnlocked || ''} 
                    onStoryComplete={handleStoryComplete} 
                    initialLineIndex={gameState.pendingStoryId === justUnlocked ? gameState.storyLineIndex : 0}
                    onLineChange={handleStoryLineChange}
                    isOverlay={true} // Always overlay to keep game visible underneath
                />
            )}

            {/* CANVAS CONTAINER */}
            {/* Observe interface destroyed if gameCompleted */}
            {!gameState.gameCompleted && (
                <div className={`absolute inset-0 transition-opacity duration-500 ${view === 'GAME' || view === 'STORY' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Pointer events logic: If in Story Overlay, canvas gets NO events, StoryView gets them. If in Game, canvas gets events. */}
                    <canvas 
                        ref={canvasRef} 
                        className={`w-full h-full touch-none cursor-crosshair ${view === 'STORY' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
                    />
                    
                    {/* --- PERSISTENT INSTRUCTIONS (First Phase Only) --- */}
                    {/* Only show if unlockedIds is empty (First Phase) AND not in Story/Room/etc */}
                    <AnimatePresence>
                        {gameState.unlockedIds.length === 0 && view === 'GAME' && (
                            <>
                               {/* TOP: Absorb Instruction */}
                               <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute top-[15%] left-0 w-full flex justify-center pointer-events-none"
                               >
                                   <div className="text-white/80 text-sm md:text-lg font-mono tracking-[0.2em] px-6 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                       {UI_TEXT.GAME.INSTRUCTION_AVOID}
                                   </div>
                               </motion.div>

                               {/* BOTTOM: Release Instruction */}
                               <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute bottom-[15%] left-0 w-full flex justify-center pointer-events-none"
                               >
                                   <div className="text-white/80 text-sm md:text-lg font-mono tracking-[0.2em] px-6 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                       {UI_TEXT.GAME.INSTRUCTION_CONTROL}
                                   </div>
                               </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showMovementHint && !justUnlocked && view === 'GAME' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[250] flex items-center justify-center bg-black/55 px-6 pointer-events-none backdrop-blur-[2px]"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full border-y border-white/30 bg-black/70 px-5 py-10 text-center font-mono text-2xl leading-relaxed tracking-[0.12em] text-white md:py-16 md:text-5xl md:tracking-[0.18em]"
                                >
                                    {UI_TEXT.GAME.INSTRUCTION_MOVE}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- STORY UNLOCK: recover a person-shaped signal from noise --- */}
                    <AnimatePresence>
                        {justUnlocked && view === 'GAME' && (
                            <UnlockSignalOverlay memberId={justUnlocked} isHolding={signalHolding} />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>

        {/* FOOTER NAV */}
        {gameState.gameCompleted ? (
            <nav aria-label={language === 'zh' ? '通关后页面' : 'Post-game pages'} className="h-16 border-t border-white/10 bg-[#050505] flex items-center justify-center gap-12 relative z-20 shrink-0 px-4">
                <button type="button" onClick={() => handleSwitchView('DEMOS')} aria-current={view === 'DEMOS' ? 'page' : undefined} className={`flex flex-col items-center gap-2 font-mono text-xs tracking-[0.2em] transition-colors hover:text-white ${view === 'DEMOS' ? 'text-white' : 'text-gray-500'}`}>
                    <span className={`h-px w-full ${view === 'DEMOS' ? 'bg-white' : 'bg-transparent'}`} />
                    {language === 'zh' ? '原创曲' : 'ORIGINAL SONG'}
                </button>
                <button type="button" onClick={() => handleSwitchView('GALLERY')} aria-current={view === 'GALLERY' ? 'page' : undefined} className={`flex flex-col items-center gap-2 font-mono text-xs tracking-[0.2em] transition-colors hover:text-white ${view === 'GALLERY' ? 'text-white' : 'text-gray-500'}`}>
                    <span className={`h-px w-full ${view === 'GALLERY' ? 'bg-white' : 'bg-transparent'}`} />
                    {language === 'zh' ? '画廊' : 'GALLERY'}
                </button>
            </nav>
        ) : (
            <div className={`h-20 border-t border-white/10 bg-[#050505] flex justify-center items-center gap-6 md:gap-12 relative z-20 shrink-0 px-4 ${view === 'STORY' ? 'invisible pointer-events-none' : ''}`}>
                <button onClick={() => handleSwitchView('GAME')} className={`flex flex-col items-center gap-2 group ${view === 'GAME' ? 'text-white' : 'text-gray-600'}`}>
                    <div className={`w-1 h-1 rounded-full ${view === 'GAME' ? 'bg-white' : 'bg-transparent'}`} />
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase group-hover:text-white transition-colors">{UI_TEXT.GAME.NAV_OBSERVE}</span>
                </button>
            </div>
        )}
    </motion.div>
  );
};

export default GameSystem;
