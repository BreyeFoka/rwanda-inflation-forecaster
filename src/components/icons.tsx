// Icon set for the app: Hugeicons, exposed as ordinary components so call sites stay <Icon className="w-4 h-4" />.
import React from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import * as H from '@hugeicons/core-free-icons';

type IconProps = { className?: string; size?: number; strokeWidth?: number };

const icon = (svg: IconSvgElement): React.FC<IconProps> => ({ className, size, strokeWidth = 1.8 }) => (
  <HugeiconsIcon icon={svg} className={className} size={size} strokeWidth={strokeWidth} />
);

export const AlertTriangle = icon(H.Alert02Icon);
export const ArrowDown = icon(H.ArrowDown02Icon);
export const ArrowRight = icon(H.ArrowRight02Icon);
export const ArrowUp = icon(H.ArrowUp02Icon);
export const Loader2 = icon(H.Loading03Icon);
export const Minus = icon(H.MinusSignIcon);
export const RefreshCw = icon(H.RefreshIcon);
export const Send = icon(H.SentIcon);
export const Sparkles = icon(H.SparklesIcon);
