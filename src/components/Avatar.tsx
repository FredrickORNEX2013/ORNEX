type AvatarProps = {
  name: string;
  color?: string;
  size?: number;
  className?: string;
};

export default function Avatar({ name, color = '#000000', size = 40, className = '' }: AvatarProps) {
  const initials = name
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
