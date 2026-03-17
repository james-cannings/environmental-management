"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/processing", label: "Processing" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/history", label: "Push History" },
  { href: "/agencies", label: "Agencies" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-[#0000EB]">
      <div className="px-6 py-8">
        <Image
          src="/msq-logo.svg"
          alt="MSQ"
          width={72}
          height={29}
          priority
          className="brightness-0 invert"
        />
        <p className="mt-3 text-xs font-light tracking-wide text-white/70 uppercase">
          Sustainability
        </p>
      </div>

      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-6 border-t border-white/15">
        <p className="text-[10px] font-light text-white/40 leading-relaxed">
          Home to Joined-up Thinking
        </p>
      </div>
    </aside>
  );
}
