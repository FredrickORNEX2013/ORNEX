export default function OrnexLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-0 select-none" style={{ fontSize: size }} aria-label="ORNEX">
      <span className="font-extrabold tracking-tighter text-white">ORNE</span>
      <span className="font-extrabold tracking-tighter text-[#D61E2B]">X</span>
    </div>
  );
}
