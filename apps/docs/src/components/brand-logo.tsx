import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

export function BrandMark() {
  return (
    <>
      <Image
        src="/logo-mark.png"
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0 object-contain"
        priority
      />
      <span className="font-bold tracking-wide">
        AZMARA <span className="text-fd-primary">PLATFORM</span>
      </span>
    </>
  );
}

export function BrandLogo({ href = "/", className, ...props }: ComponentProps<"a">) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className ?? ""}`} {...props}>
      <BrandMark />
    </Link>
  );
}
