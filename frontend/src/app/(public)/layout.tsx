import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OptiRev - AI-Powered Customer Relationship Management",
  description:
    "Close deals 3x faster with AI lead scoring, dynamic pipelines, and role-based access control.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
