// ============================================================
// Auth Layout - Minimal layout for login/register pages
// ============================================================
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OptiRev - Login",
  description: "Login to your OptiRev account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans antialiased">
      {children}
    </div>
  );
}
