import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const DESCRIPTION =
  "Turn a GPS activity (GPX, GeoJSON, FIT, KML or Suunto) into a cinematic 9:16 flyover video — entirely in your browser.";

// og:image / twitter:image come from the app/opengraph-image.png file convention;
// `metadataBase` makes their URLs absolute so WhatsApp/Slack/Twitter can fetch them.
// Set NEXT_PUBLIC_SITE_URL to your deployed origin so the preview image resolves.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Route Flyover Studio",
  description: DESCRIPTION,
  applicationName: "Route Flyover Studio",
  openGraph: {
    type: "website",
    siteName: "Route Flyover Studio",
    title: "Route Flyover Studio — cinematic flyover videos from your GPS activities",
    description: DESCRIPTION,
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Route Flyover Studio",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06070a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Loaded via <link> (not next/font) on purpose: the canvas HUD draws text with
          the literal family names "Space Grotesk" / "IBM Plex Mono", and the engine
          awaits document.fonts.ready before the first paint.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/*
          Pre-paint: set the theme + accent from the URL before first paint so the
          UI never flashes the default (dark) theme before React's effect runs.
          Mirrors the accent rule in useFlyover so React hydrates to the same value.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var q=new URLSearchParams(location.search);var GREEN='#c8ff3d',ORANGE='#ff5a1f';var st={};try{if(localStorage.getItem('rfs:consent')==='granted'){st.theme=localStorage.getItem('rfs:theme');st.accent=localStorage.getItem('rfs:accent');}}catch(e){}var theme=q.get('theme')||st.theme;if(theme!=='light'&&theme!=='dark')theme='dark';var a=q.get('accent')||st.accent;if(a){a=(a.charAt(0)==='#'?a:'#'+a).toLowerCase();if(!/^#[0-9a-f]{6}$/.test(a))a=null;}if(!a){a=theme==='light'?ORANGE:GREEN;}var el=document.documentElement;el.setAttribute('data-theme',theme);el.style.setProperty('--accent',a);}catch(e){}})();",
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
