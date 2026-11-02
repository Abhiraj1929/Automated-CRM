// ============================================================
// Auth Layout - Minimal layout for login/register pages
// ============================================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

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
    <div className={inter.className}>
      {children}
    </div>
  );
}
