import React from 'react';
import { CHAR_CONFIG, SpriteFrame } from '../content/spriteData';

interface CharacterSpriteProps {
  charId: string;
  expression: string;
  className?: string;
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ charId, expression, className }) => {
  // 1. 获取该角色的配置数据
  const config = CHAR_CONFIG[charId];
  if (!config) return null;

  // 2. 查找表情帧 (Face)
  // 如果 expression 为空，默认找第一个key，或者不做处理（这里假设外部传入有效expression）
  // 简单的 fallback 逻辑
  let faceFrameName = expression;
  let faceData = config.json.frames[faceFrameName];

  // 如果找不到特定的 expression，尝试找任意一个带有 'face' 的 key 作为默认
  if (!faceData) {
      const defaultFace = Object.keys(config.json.frames).find(k => k.includes('face'));
      if (defaultFace) {
          faceFrameName = defaultFace;
          faceData = config.json.frames[defaultFace];
      }
  }

  // 3. 智能推导身体帧 (Base)
  // 逻辑改进：
  // A. 尝试直接替换 _face 为 _base (例如 77_smile_face -> 77_smile_base)
  // B. 如果 A 找不到，则遍历 frames 寻找任意一个包含 '_base' 的帧作为通用身体
  let baseFrameName = expression.replace(/_face(\.webp)?$/, '_base.webp');
  let baseData = config.json.frames[baseFrameName];

  if (!baseData) {
      const fallbackBase = Object.keys(config.json.frames).find(key => key.includes('_base'));
      if (fallbackBase) {
          baseData = config.json.frames[fallbackBase];
      }
  }

  // 如果没有表情数据，至少显示身体；如果没有身体，那就什么都显示不了
  if (!baseData && !faceData) return null;

  // 辅助函数：将帧数据转换为 CSS 样式
  const getStyle = (frameData: SpriteFrame): React.CSSProperties => {
    return {
        backgroundImage: `url(${config.image})`,
        backgroundPosition: `-${frameData.frame.x}px -${frameData.frame.y}px`,
        width: `${frameData.frame.w}px`,
        height: `${frameData.frame.h}px`,
        position: 'absolute',
        left: `${frameData.spriteSourceSize.x}px`,
        top: `${frameData.spriteSourceSize.y}px`,
        backgroundRepeat: 'no-repeat',
    };
  };

  // 容器尺寸计算
  // 优先使用身体的尺寸作为容器基准，因为身体通常决定了整体占位
  const refData = baseData || faceData;
  if (!refData) return null;

  const fullWidth = refData.sourceSize.w;
  const fullHeight = refData.sourceSize.h;

  // 裁切设置
  // 0.6 确保显示足够的上半身
  const CROP_RATIO = 0.6; 
  const displayHeight = fullHeight * CROP_RATIO;

  const containerStyle: React.CSSProperties = {
    width: `${fullWidth}px`,
    height: `${displayHeight}px`,
    position: 'relative',
    overflow: 'hidden',
    // 添加底部渐隐遮罩
    maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
    // 特殊处理：霖安 (bass) 需要左右翻转
    transform: charId === 'bass' ? 'scaleX(-1)' : 'none',
  };

  return (
    <div className={`${className} relative`} style={containerStyle}>
      {/* 1. 底层：身体 */}
      {baseData && <div style={getStyle(baseData)} />}
      
      {/* 2. 顶层：表情 */}
      {faceData && <div style={getStyle(faceData)} />}
    </div>
  );
};

export default CharacterSprite;
