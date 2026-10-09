import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "NetSentinel | UNSW-NB15 Intrusion Detection",
  description:
    "Live demonstration of a network intrusion detector trained on the original UNSW-NB15 dataset (Random Forest + XGBoost with TreeSHAP).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="font-sans min-h-full flex flex-col relative text-primary antialiased">
        {/* Fixed Ambient Glass Background Blobs */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
          {/* Lavender Blob #E0E7FF */}
          <div
            className="bg-blob blob-1 absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full opacity-60 blur-3xl"
            style={{ backgroundColor: "#E0E7FF" }}
          />
          {/* Sky Blob #DBEAFE */}
          <div
            className="bg-blob blob-2 absolute top-1/4 -right-24 w-[40rem] h-[40rem] rounded-full opacity-55 blur-3xl"
            style={{ backgroundColor: "#DBEAFE" }}
          />
          {/* Mint Blob #D1FAE5 */}
          <div
            className="bg-blob blob-3 absolute -bottom-32 left-1/3 w-[38rem] h-[38rem] rounded-full opacity-55 blur-3xl"
            style={{ backgroundColor: "#D1FAE5" }}
          />
        </div>

        <Providers>
          <div className="flex-1 flex flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
