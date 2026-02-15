import type { Metadata, Viewport } from "next";
import { Anton, Fredoka, Nunito } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const anton = Anton({
  variable: "--font-meme",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FF6B4A",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://whatmypetthinks.com"),
  title: "What My Pet Thinks — Find Out What Your Pet Is Really Thinking",
  description:
    "Upload a photo of your pet and AI will translate their thoughts. Free, instant, hilarious.",
  keywords: [
    "what my pet thinks",
    "what is my pet thinking",
    "AI pet translator",
    "funny pet captions",
    "pet thought bubble",
    "pet meme generator",
    "dog thoughts",
    "cat thoughts",
    "pet caption generator",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://whatmypetthinks.com",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "What My Pet Thinks",
  },
  openGraph: {
    title: "What My Pet Thinks",
    description:
      "Find out what your pet would text you",
    url: "https://whatmypetthinks.com",
    siteName: "What My Pet Thinks",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "What My Pet Thinks 🐾",
    description:
      "Find out what your pet would text you",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* GA4 Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-LJJE0F7RH9" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-LJJE0F7RH9');`,
          }}
        />
        {/* iOS splash screens */}
        <link rel="apple-touch-startup-image" href="/splash/iphone-se.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-8.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-8-plus.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-x.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-xr.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-xsmax.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-12.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-12-max.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-14-pro.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-14-promax.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-15-pro.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/ipad.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipad-pro-11.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipad-pro-13.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className={`${anton.variable} ${fredoka.variable} ${nunito.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "What My Pet Thinks",
              url: "https://whatmypetthinks.com",
              description:
                "Upload a photo of your pet and AI translates their inner monologue into hilarious movie-style subtitles.",
              applicationCategory: "Entertainment",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              image: "https://whatmypetthinks.com/og-image.png",
            }),
          }}
        />
        <ServiceWorkerRegistrar />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
