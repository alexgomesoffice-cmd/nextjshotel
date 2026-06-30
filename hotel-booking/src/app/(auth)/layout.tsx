import type { Metadata } from "next";
import "../globals.css";


export const metadata: Metadata = {
  title: "GhuriBangla"
};

export default function LogInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
