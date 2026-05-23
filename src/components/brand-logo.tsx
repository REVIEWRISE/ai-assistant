import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

const SIZES = {
  sm: { box: "h-8 w-8", img: 32 },
  md: { box: "h-10 w-10 sm:h-11 sm:w-11", img: 44 },
} as const;

type BrandLogoProps = {
  href?: string;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  primary?: string;
  secondary?: string;
  className?: string;
  linkClassName?: string;
};

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  primary = BRAND_NAME,
  secondary,
  className = "",
  linkClassName = "",
}: BrandLogoProps) {
  const s = SIZES[size];

  const content = (
    <span className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${className}`}>
      <span className={`relative ${s.box} shrink-0`}>
        <Image
          src={BRAND_LOGO_PATH}
          alt={`${BRAND_NAME} logo`}
          width={s.img}
          height={s.img}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {showWordmark ? (
        <span className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-inherit">{primary}</p>
          {secondary ? (
            <p className="truncate text-xs text-inherit opacity-80">{secondary}</p>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className={`group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${linkClassName}`}
    >
      {content}
    </Link>
  );
}
