export default function OrnexLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-0 select-none" style={{ fontSize: size }} aria-label="ORNEX">
      <span className="font-extrabold tracking-tighter text-white">O</span>
      <span className="font-extrabold tracking-tighter text-white">RNE</span>
      <span className="font-extrabold tracking-tighter text-white">X</span>
    </div>
  );
}
