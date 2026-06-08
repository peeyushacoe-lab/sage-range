import { signIn } from "@/auth";

// Registration happens inside Keycloak — this page redirects straight to SSO sign-in.
export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-500 mb-3">SAGE FORGE</p>
          <h1 className="text-2xl font-bold text-zinc-100">Create account</h1>
          <p className="text-sm text-zinc-500 mt-1">Register via Sage Forge SSO</p>
        </div>

        <form action={async () => {
          "use server";
          await signIn("keycloak");
        }}>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Continue with Sage Forge SSO
          </button>
        </form>

        <p className="text-xs text-zinc-600 text-center">
          Account registration is handled securely through our identity provider.
        </p>
      </div>
    </main>
  );
}
