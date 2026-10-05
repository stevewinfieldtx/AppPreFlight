"use client";
import { useState } from "react";
import ScreenshotStudio from "@/components/ScreenshotStudio";

export default function ScreenshotsPage() {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  return <main style={{ maxWidth: 1200, padding: "32px 20px", margin: "0 auto", color: "#fff" }}>
    <a href="/" style={{ color: "#76dab5" }}>← AppPreFlight</a>
    <h1>Turn your app screens into a store showcase</h1>
    <p style={{ color: "#aaa" }}>Start here without an interview. {count} screenshot{count === 1 ? "" : "s"} in your local draft.</p>
    <ScreenshotStudio slug="screenshot-studio" headlines={headlines} onHeadlinesChange={setHeadlines} onCountChange={setCount} />
  </main>;
}
