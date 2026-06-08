import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-500 mb-3">SAGE FORGE</p>
          <h1 className="text-2xl font-bold text-zinc-100">Sign in</h1>
          <p className="text-sm text-zinc-500 mt-1">Continue to your account</p>
        </div>

        <form action={async () => {
          "use server";
          await signIn("keycloak");
        }}>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Sign in with Sage Forge SSO
          </button>
        </form>

        <p className="text-xs text-zinc-600 text-center">
          New here? Signing in will create your account automatically.
        </p>
      </div>
    </main>
  );
}
