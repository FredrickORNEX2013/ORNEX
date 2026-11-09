type AvatarProps = {
  name: string;
  color?: string;
  size?: number;
  className?: string;
};

const ORNEX_AVATAR_COLORS = new Set(['#000000', '#111111', '#A020F0', '#8A2BE2', '#C084FC', '#FFFFFF']);

export default function Avatar({ name, color = '#8A2BE2', size = 40, className = '' }: AvatarProps) {
  const initials = name
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const safeColor = ORNEX_AVATAR_COLORS.has(color.toUpperCase()) ? color : '#8A2BE2';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ backgroundColor: safeColor, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
