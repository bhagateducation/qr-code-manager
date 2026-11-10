import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-screen">
      <h1>This page could not be found.</h1>
      <Link className="button primary" href="/">
        Back to home
      </Link>
    </main>
  );
}
