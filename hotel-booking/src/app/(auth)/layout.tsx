import type { Metadata } from "next";
import "../globals.css";


export const metadata: Metadata = {
  title: "Hotel Booking App"
};

export default function LogInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
