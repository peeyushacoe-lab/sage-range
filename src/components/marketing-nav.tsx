import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";

export async function MarketingNav() {
  const session = await auth();
  const isSignedIn = !!session;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="Sage Vault" width={42} height={42} className="rounded-md" unoptimized />
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-tight text-white text-sm">Sage Vault</span>
            <span className="text-[9px] text-zinc-500 tracking-wide">by CyberSage</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/about"   className="hover:text-white transition-colors">About</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3 text-sm shrink-0">
          {!isSignedIn && (
            <>
              <Link href="/sign-in" className="text-zinc-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg bg-sage-500 px-4 py-2 font-semibold text-black hover:bg-sage-400 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="rounded-lg bg-sage-500 px-4 py-2 font-semibold text-black hover:bg-sage-400 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
