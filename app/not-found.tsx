import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-screen">
      <h1>This page could not be found.</h1>
      <Link className="button primary" href="/">
        Return to QR Manager
      </Link>
    </main>
  );
}
