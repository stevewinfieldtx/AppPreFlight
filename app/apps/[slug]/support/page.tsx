// /app/apps/[slug]/support/page.tsx
import { getAppBySlug } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function SupportPage({
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
        <div style={styles.kicker}>Support</div>
        <h1 style={styles.h1}>{app.appName}</h1>
        <p style={styles.lead}>Need help? We're here for you.</p>

        <section style={styles.contactBox}>
          <div style={styles.contactRow}>
            <span style={styles.contactLabel}>Email</span>
            <a href={`mailto:${app.support.email}`} style={styles.link}>
              {app.support.email}
            </a>
          </div>
          {app.support.url && (
            <div style={styles.contactRow}>
              <span style={styles.contactLabel}>Website</span>
              <a
                href={app.support.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                {app.support.url}
              </a>
            </div>
          )}
          <div style={styles.contactRow}>
            <span style={styles.contactLabel}>Company</span>
            <span style={{ color: "#444" }}>{app.companyName}</span>
          </div>
        </section>

        {app.support.faq.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.h2}>Frequently asked questions</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {app.support.faq.map((item) => (
                <div key={item.question} style={styles.faqItem}>
                  <h3 style={styles.h3}>{item.question}</h3>
                  <p style={styles.body}>{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.h2}>When contacting support</h2>
          <p style={styles.body}>
            Please include the following to help us resolve your issue
            quickly:
          </p>
          <ul style={styles.list}>
            <li style={styles.li}>Your device model and OS version</li>
            <li style={styles.li}>
              What you were doing when the issue occurred
            </li>
            <li style={styles.li}>Screenshots if relevant</li>
            <li style={styles.li}>
              The app version (found in Settings or About)
            </li>
          </ul>
        </section>
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
  contactBox: {
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e8e8e8",
    background: "#fafafa",
    display: "grid",
    gap: 12
  },
  contactRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 15
  },
  contactLabel: {
    fontWeight: 700,
    color: "#222",
    fontSize: 14
  },
  section: { marginTop: 32 },
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#222" },
  h3: { fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#222" },
  body: { color: "#444", fontSize: 15, lineHeight: 1.7, margin: 0 },
  list: { margin: "8px 0 0 20px", padding: 0 },
  li: { color: "#444", fontSize: 15, lineHeight: 1.7, marginBottom: 4 },
  faqItem: {
    padding: 16,
    borderRadius: 10,
    border: "1px solid #e8e8e8",
    background: "#fafafa"
  },
  link: { color: "#111", fontWeight: 600 }
};
