import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("h-7 w-7", className)}>
      <rect width="64" height="64" rx="15" fill="#2F45FF" />
      <path d="M13 46 L25 34 L33 40 L44 28" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="46" r="3.5" fill="#fff" />
      <path d="M49 9 C50 15 51 16 57 17 C51 18 50 19 49 25 C48 19 47 18 41 17 C47 16 48 15 49 9 Z" fill="#FFE45C" />
    </svg>
  );
}

export function Logo({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 rounded-md", className)}>
      <LogoMark className="shrink-0" />
      <span className="whitespace-nowrap font-display text-lg font-bold tracking-tight">CareerPath AI</span>
    </Link>
  );
}
