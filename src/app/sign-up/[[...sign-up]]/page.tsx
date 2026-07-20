import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./signup-form";
import { getPlanPricing } from "@/lib/plan-pricing";

export default async function SignUpPage() {
  const [session, plans] = await Promise.all([auth(), getPlanPricing()]);
  if (session) redirect("/api/user/fix-session");
  const nexusUrl = process.env.NEXUS_SSO_AUTHORIZE_URL;
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo.ico" alt="Sage Vault" width={40} height={40} className="rounded-lg" unoptimized />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-zinc-500 text-sm mt-1">Choose your plan — free for students</p>
        </div>

        <SignupForm plans={plans} nexusUrl={nexusUrl} />

        <p className="text-center text-sm text-zinc-500 mt-5">
          Already have an account?{" "}
          <a href="/sign-in" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
