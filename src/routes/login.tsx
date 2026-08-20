import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-svh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
          Grok Mirror
        </p>
        <h1 className="mt-3 font-display text-4xl italic">It looks back.</h1>
        <p className="mt-3 text-sm font-light leading-relaxed text-muted">
          Sign in to carry settings across devices. The mirror itself works
          without an account.
        </p>
        <div className="mt-8 space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="solid"
                className="w-full"
                type="button"
                onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-8 inline-block text-sm text-muted hover:text-fg"
        >
          Back to the mirror
        </Link>
      </div>
    </main>
  );
}
