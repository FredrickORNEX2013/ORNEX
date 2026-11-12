export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatViews(views: number): string {
  if (!views) return "0";
  if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(views);
}

export function formatNumber(n: number): string {
  return formatViews(n);
}
