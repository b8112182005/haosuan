import Link from "next/link";
import { Calculator } from "lucide-react";

const categories = [
  { label: "生活", href: "/life" },
  { label: "財務", href: "/finance" },
  { label: "裝潢", href: "/renovation" },
  { label: "換算", href: "/convert" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl px-4 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          <span>好算</span>
        </Link>
        <nav className="flex items-center gap-1">
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
            >
              {cat.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
