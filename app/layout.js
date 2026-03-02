import "./globals.css";

export const metadata = {
  title: "Employee Management System",
  description: "Internal employee management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="dark-theme min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
