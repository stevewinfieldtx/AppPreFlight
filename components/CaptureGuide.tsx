"use client";

export default function CaptureGuide({ headlines }: { headlines: string[] }) {
  return <div style={{ padding: 20, border: "1px solid #294438", borderRadius: 14, background: "#0c1913", marginBottom: 20, lineHeight: 1.6 }}>
    <strong>1. Capture → 2. Upload & label → 3. Style → 4. Export & submit</strong>
    <p style={{ color: "#b6c8be", fontSize: 14 }}>AppPreFlight formats your real app screens. Use the connected iPhone simulator above to capture directly, or upload captures from your own phone or simulator.</p>
    <details open><summary style={{ cursor: "pointer", fontWeight: 700 }}>What to capture</summary>
      <ol style={{ paddingLeft: 24, color: "#b6c8be", fontSize: 14 }}>
        {(headlines.length ? headlines : ["Your app’s main benefit", "Your most useful feature", "The result users get", "A second useful workflow", "Personalization or settings"]).slice(0, 10).map((h, i) => <li key={i}><strong>{h || `Feature ${i + 1}`}</strong> — open the screen that proves this benefit, then capture it.</li>)}
      </ol>
      <p style={{ color: "#b6c8be", fontSize: 13 }}>Aim for 3–5 strong images. Lead with the main benefit and show one idea per screen. Use a clean demo account, remove personal information, and show features your release actually includes. Apple accepts 1–10 images per display size.</p>
    </details>
    <details><summary style={{ cursor: "pointer", fontWeight: 700 }}>How to take screenshots</summary>
      <ul style={{ paddingLeft: 24, color: "#b6c8be", fontSize: 14 }}>
        <li><strong>iPhone / iPad:</strong> press the side or top button and volume up together (Home-button models: Home and side/top). Transfer the original PNG files to this computer.</li>
        <li><strong>Xcode Simulator on a Mac:</strong> launch your app, navigate to each screen, and choose File → Save Screen or press Command-S. You can also run <code>xcrun simctl io booted screenshot screen-01.png</code>.</li>
        <li><strong>Android:</strong> press power and volume down together, or use the Android Emulator’s screenshot button. Transfer the original files. This studio currently exports Apple sizes; prepare Android assets separately using Google’s guide.</li>
        <li><strong>Web app:</strong> open your app in the browser’s mobile device view at the intended viewport, navigate to the screen, and use the developer tools’ Capture screenshot command. Review that it matches the app you’re submitting.</li>
      </ul>
    </details>
    <details><summary style={{ cursor: "pointer", fontWeight: 700 }}>Where to upload the finished images</summary>
      <p style={{ color: "#b6c8be", fontSize: 14 }}>Download the ZIP below, extract it, then open your app’s version in App Store Connect → App Previews and Screenshots. Choose the matching display size and language, and upload the numbered PNGs in order. Select the iPhone 6.9-inch set first; iPad apps also need real iPad captures in the 13-inch set. Preview the listing before submitting your build.</p>
      <p style={{ fontSize: 13 }}><a style={{ color: "#76dab5" }} href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/" target="_blank" rel="noreferrer">Apple screenshot specifications</a> · <a style={{ color: "#76dab5" }} href="https://support.google.com/googleplay/android-developer/answer/9866151?hl=en" target="_blank" rel="noreferrer">Google Play asset guide</a></p>
    </details>
  </div>;
}
