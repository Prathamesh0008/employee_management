import "./globals.css";

export const metadata = {
  title: "Employee Management System",
  description: "Internal employee management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
