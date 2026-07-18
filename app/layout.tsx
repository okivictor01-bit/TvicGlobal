import "./globals.css";

export const metadata = {
  title: "TvicGlobal",
  description: "Multi-branch produce purchasing & accounting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
