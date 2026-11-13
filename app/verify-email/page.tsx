import type { Metadata } from "next";
import { emailDeliveryConfigured } from "@/lib/email";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Verify your email" };
export const dynamic = "force-dynamic";

export default async function Page() {
  return <VerifyEmailForm emailAvailable={await emailDeliveryConfigured()} />;
}
