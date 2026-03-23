// /app/apps/[slug]/privacy/page.tsx
import { getAppBySlug } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) notFound();

  const p = app.privacy;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <main style={styles.main}>
      <article style={styles.card}>
        <div style={styles.kicker}>Privacy policy</div>
        <h1 style={styles.h1}>{app.appName}</h1>
        <p style={styles.date}>Last updated: {today}</p>

        <section style={styles.section}>
          <p style={styles.body}>
            This Privacy Policy explains how {app.companyName} ("we", "us")
            collects, uses, and protects information in connection with{" "}
            {app.appName} (the "App").
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Information we collect</h2>
          {p.dataCollected.length > 0 ? (
            <ul style={styles.list}>
              {p.dataCollected.map((item) => (
                <li key={item} style={styles.li}>{item}</li>
              ))}
            </ul>
          ) : (
            <p style={styles.body}>
              We do not intentionally collect personal information beyond
              what is required to operate the App.
            </p>
          )}
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>How we use information</h2>
          <ul style={styles.list}>
            <li style={styles.li}>To provide and maintain the App</li>
            <li style={styles.li}>To improve performance and fix issues</li>
            <li style={styles.li}>To provide customer support</li>
            <li style={styles.li}>To comply with legal obligations</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>App behavior</h2>
          <table style={styles.table}>
            <tbody>
              <Row label="User accounts" value={p.collectsAccounts} />
              <Row label="Analytics" value={p.collectsAnalytics} />
              <Row label="Payments" value={p.collectsPayments} />
              <Row label="Location data" value={p.collectsLocation} />
              <Row label="User-generated content" value={p.collectsUserContent} />
              <Row label="Tracking / advertising" value={p.usesTracking} />
              <Row label="Directed to children under 13" value={p.childrenUnder13} />
            </tbody>
          </table>
        </section>

        {p.thirdParties.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.h2}>Third-party services</h2>
            <ul style={styles.list}>
              {p.thirdParties.map((item) => (
                <li key={item} style={styles.li}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.h2}>Data sharing</h2>
          <p style={styles.body}>
            We do not sell your personal information. We may share
            information with service providers who help us operate the
            App, under confidentiality obligations.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Your choices</h2>
          <p style={styles.body}>
            You may request access, correction, or deletion of your data
            by contacting us at{" "}
            <a href={`mailto:${p.contactEmail}`} style={styles.link}>
              {p.contactEmail}
            </a>
            .
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Contact</h2>
          <p style={styles.body}>
            For privacy-related questions, email{" "}
            <a href={`mailto:${p.contactEmail}`} style={styles.link}>
              {p.contactEmail}
            </a>
            .
          </p>
        </section>

        <section style={styles.notice}>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            This policy was generated from information provided during
            onboarding and should be reviewed for legal compliance
            before production release.
          </p>
        </section>
      </article>
    </main>
  );
}

function Row({ label, value }: { label: string; value: boolean }) {
  return (
    <tr>
      <td style={{ padding: "8px 12px 8px 0", color: "#444", fontSize: 15 }}>
        {label}
      </td>
      <td
        style={{
          padding: "8px 0",
          fontWeight: 700,
          fontSize: 15,
          color: value ? "#1d9e75" : "#999"
        }}
      >
        {value ? "Yes" : "No"}
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#fafafa",
    color: "#111",
    padding: "32px 16px",
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  },
  card: {
    maxWidth: 780,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 16,
    padding: "36px 32px"
  },
  kicker: {
    color: "#999",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700
  },
  h1: { fontSize: 36, margin: "8px 0 4px", fontWeight: 900 },
  date: { color: "#999", fontSize: 14, margin: "0 0 24px" },
  section: { marginTop: 28 },
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "#222" },
  body: { color: "#444", fontSize: 16, lineHeight: 1.7, margin: 0 },
  list: { margin: "4px 0 0 20px", padding: 0 },
  li: { color: "#444", fontSize: 15, lineHeight: 1.7, marginBottom: 4 },
  table: { borderCollapse: "collapse", width: "100%", marginTop: 4 },
  link: { color: "#111", fontWeight: 600 },
  notice: {
    marginTop: 36,
    padding: 16,
    borderRadius: 10,
    background: "#f5f5f0",
    border: "1px solid #e8e8e0"
  }
};
