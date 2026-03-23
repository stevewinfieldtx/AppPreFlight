export default function Privacy() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Privacy Policy</h1>
      <p>
        AppPreflight analyzes repositories to generate a compliance-style report. Do not include secrets.
        For public GitHub repos, we fetch the repository ZIP via GitHubâ€™s API to inspect relevant config files.
      </p>
      <p>
        Replace this page with your full Privacy Policy before taking payments.
      </p>
    </main>
  );
}
