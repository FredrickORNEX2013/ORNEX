export default function OrnexLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-0 select-none" style={{ fontSize: size }}>
      <span className="font-extrabold tracking-tighter text-black">O</span>
      <span className="font-extrabold tracking-tighter text-black">RNE</span>
      <span className="font-extrabold tracking-tighter text-black">X</span>
    </div>
  );
}
