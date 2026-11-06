"use client";
export default function ErrorPage() {
  return (
    <main className="loading-screen">
      <h1>The workspace is temporarily unavailable.</h1>
      <p>
        Your data has not been replaced. Please contact the site owner if this
        continues.
      </p>
      <a className="button" href="/">
        Return to website
      </a>
    </main>
  );
}
