import Image from "next/image";

export function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <Image
      src="/vibe-tech-mark.svg"
      alt="Vibe Tech"
      width={64}
      height={64}
      className={className}
      unoptimized
    />
  );
}
