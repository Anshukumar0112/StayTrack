import type { Metadata } from "next";
import HostAppShell from "@/components/host/HostAppShell";

export const metadata: Metadata = {
  title: "StayTrack | Host Portal",
  description: "Unified host property management, bookings, earnings, and operations across Delhi NCR.",
};

export default function HostRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HostAppShell>{children}</HostAppShell>;
}
