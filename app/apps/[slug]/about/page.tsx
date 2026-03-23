// /app/apps/[slug]/about/page.tsx
import { getAppBySlug } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function AboutPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) notFound();

  return (
    <main style={styles.main}>
      <article style={styles.card}>
        <div style={styles.kicker}>About</div>
        <h1 style={styles.h1}>{app.appName}</h1>
        <p style={styles.lead}>{app.oneLiner}</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>What it does</h2>
          <p style={styles.body}>{app.corePurpose}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Who it's for</h2>
          <p style={styles.body}>{app.targetAudience}</p>
        </section>

        {app.keyFeatures.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.h2}>Key features</h2>
            <ul style={styles.list}>
              {app.keyFeatures.map((f) => (
                <li key={f} style={styles.li}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        {app.differentiators.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.h2}>Why it's different</h2>
            <ul style={styles.list}>
              {app.differentiators.map((d) => (
                <li key={d} style={styles.li}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.h2}>Founder's favorite part</h2>
          <p style={styles.body}>{app.favoritePart}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>What's next</h2>
          <p style={styles.body}>{app.whatNext}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Our story</h2>
          <p style={styles.body}>{app.founderStory}</p>
        </section>

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            {app.companyName} · {app.support.email}
          </p>
        </footer>
      </article>
    </main>
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
  lead: { color: "#555", fontSize: 18, lineHeight: 1.6, margin: "0 0 24px" },
  section: { marginTop: 28 },
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#222" },
  body: { color: "#444", fontSize: 16, lineHeight: 1.7, margin: 0 },
  list: { margin: "8px 0 0 20px", padding: 0 },
  li: { color: "#444", fontSize: 16, lineHeight: 1.7, marginBottom: 4 },
  footer: { marginTop: 36, paddingTop: 20, borderTop: "1px solid #eee" },
  footerText: { color: "#999", fontSize: 13, margin: 0 }
};
