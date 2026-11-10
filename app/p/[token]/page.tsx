import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Public record",
  robots: { index: false, follow: false },
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function PublicRecordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  const record = await prisma.record.findFirst({
    where: { publicToken: token, isPublic: true },
    include: { system: { include: { fields: { orderBy: { order: "asc" } } } } },
  });
  if (!record) notFound();
  const values = record.data as Record<string, unknown>;
  return (
    <main className="auth-shell public-record-shell">
      <div className="auth-card panel public-record-card">
        <span className="badge">Public record</span>
        <h1>{record.title}</h1>
        <p className="muted">{record.system.name}</p>
        <div className="public-record-fields">
          {record.system.fields.map((field) => {
            const value = values[field.key];
            const text = displayValue(value);
            const isLink = typeof value === "string" && /^https?:\/\//i.test(value);
            return (
              <div className="public-record-field" key={field.id}>
                <span>{field.label}</span>
                {isLink ? <a href={value} target="_blank" rel="noopener noreferrer">{text}</a> : <strong>{text}</strong>}
              </div>
            );
          })}
        </div>
        <small className="muted">Powered by {BRAND}</small>
      </div>
    </main>
  );
}
