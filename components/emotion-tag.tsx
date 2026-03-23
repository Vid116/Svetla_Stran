import { ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';

interface EmotionTagProps {
  antidote?: string | null;
}

export function EmotionTag({ antidote }: EmotionTagProps) {
  if (!antidote || !ANTIDOTE_LABELS[antidote]) return null;

  return (
    <span className={`text-sm font-medium ${ANTIDOTE_COLORS[antidote].text}`}>
      Zdravilo za {antidote}
    </span>
  );
}
