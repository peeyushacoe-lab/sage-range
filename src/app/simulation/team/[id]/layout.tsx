import { Navbar } from "@/components/navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/simulation/team" backLabel="Team Simulations" />
      {children}
    </div>
  );
}
