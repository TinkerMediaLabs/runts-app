import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  ArrowClockwise, ArrowCounterClockwise, ArrowRight, ArrowsClockwise, ArrowsDownUp, Book, BookOpen, BookmarkSimple,
  Books, Bug, Buildings, Camera, CaretDown, CaretLeft, CaretRight, Check, CheckCircle, Clock, ClockCounterClockwise,
  Compass, Crown, DeviceMobile, DotsSixVertical, DotsThree, DotsThreeVertical, DownloadSimple, Envelope, Eye,
  EyeSlash, FileText, Fire, Gauge, Gear, GitBranch, Globe, HardDrives, Headphones, InfinityIcon, Info, InstagramLogo,
  Key, Lightbulb, Lightning, List, Lock, LockOpen, MagnifyingGlass, Microphone, Moon, Pause, PencilSimple, Play,
  PlayCircle, Prohibit, PushPin, Question, ShareNetwork, ShieldCheck, SignOut, SkipForward, Sparkle, SpeakerHigh,
  Star, Tag, Trash, User, UserGear, UserMinus, UserPlus, Users, Warning, WarningCircle, WifiHigh, X, XCircle,
} from 'phosphor-react-native';
import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';

// The one icon component. Screens ask for an icon by our own name, never by a library's, so the icon family can
// change in this file alone. Phosphor: thin ("light") by default, "fill" for active or emphasised states.
const ICONS = {
  'sparkles': Sparkle,
  'compass': Compass,
  'library': Books,
  'crown': Crown,
  'user': User,
  'book-open': BookOpen,
  'headphones': Headphones,
  'microphone': Microphone,
  'star': Star,
  'share': ShareNetwork,
  'chevron-down': CaretDown,
  'chevron-right': CaretRight,
  'close': X,
  'play': Play,
  'clock': Clock,
  'check-circle': CheckCircle,
  'download': DownloadSimple,
  'redo': ArrowClockwise,
  'pin': PushPin,
  'pause': Pause,
  'skip-forward': SkipForward,
  'rotate-ccw': ArrowCounterClockwise,
  'rotate-cw': ArrowClockwise,
  'more-vertical': DotsThreeVertical,
  'x-circle': XCircle,
  'info-circle': Info,
  'moon': Moon,
  'bookmark': BookmarkSimple,
  'check': Check,
  'lock': Lock,
  'exclamation-triangle': Warning,
  'exclamation-circle': WarningCircle,
  'chevron-left': CaretLeft,
  'envelope': Envelope,
  'key': Key,
  'sign-out-alt': SignOut,
  'trash': Trash,
  'fire': Fire,
  'lock-open': LockOpen,
  'list': List,
  'play-circle': PlayCircle,
  'mobile-alt': DeviceMobile,
  'tachometer-alt': Gauge,
  'user-slash': UserMinus,
  'lightbulb': Lightbulb,
  'tag': Tag,
  'tags': Tag,
  'volume-up': SpeakerHigh,
  'code-branch': GitBranch,
  'file-contract': FileText,
  'shield-alt': ShieldCheck,
  'question-circle': Question,
  'bug': Bug,
  'globe': Globe,
  'instagram': InstagramLogo,
  'user-edit': PencilSimple,
  'bolt': Lightning,
  'book': Book,
  'eye': Eye,
  'eye-slash': EyeSlash,
  'user-cog': UserGear,
  'history': ClockCounterClockwise,
  'cog': Gear,
  'user-friends': Users,
  'user-plus': UserPlus,
  'wifi': WifiHigh,
  'hdd': HardDrives,
  'search': MagnifyingGlass,
  'grip-lines': DotsSixVertical,
  'sync-alt': ArrowsClockwise,
  'sort': ArrowsDownUp,
  'camera': Camera,
  'pen': PencilSimple,
  'arrow-right': ArrowRight,
  'ellipsis-h': DotsThree,
  'ban': Prohibit,
  'infinity': InfinityIcon,
  'building': Buildings,
  'thumbtack': PushPin,
} as const satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

// Transport and tile play buttons read better solid.
const DEFAULT_WEIGHT: Partial<Record<IconName, IconWeight>> = { play: 'fill', pause: 'fill' };

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  // Defaults: "light" at 16 and up, "regular" below that (light strokes disappear on tiny icons).
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
};

const Icon = ({ name, size = 20, color = '#fff', weight, style }: Props) => {
  const Glyph = ICONS[name];
  // A name that is not in the set (for example one that arrives from data) must never crash a screen.
  if (!Glyph) {
    if (__DEV__) console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return <Glyph size={size} color={color} style={style} weight={weight ?? DEFAULT_WEIGHT[name] ?? (size < 16 ? 'regular' : 'light')} />;
};

export default Icon;
