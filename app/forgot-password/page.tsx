import type { Metadata } from "next";
import Link from "next/link";
import { emailDeliveryConfigured } from "@/lib/email";
import ResetRequestForm from "./ResetRequestForm";

export const metadata: Metadata = { title: "Reset your password" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (await emailDeliveryConfigured()) return <ResetRequestForm />;

  return (
    <main className="auth-shell">
      <div className="auth-card panel">
        <h1>Reset your password</h1>
        <p className="muted">Password reset email is currently unavailable.</p>
        <Link href="/login">Back to sign in</Link>
      </div>
    </main>
  );
}
