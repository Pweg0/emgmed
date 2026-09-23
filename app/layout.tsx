import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ranking Colaborativo — Medicina de Emergência",
  description: "Estimativa colaborativa de classificação para Medicina de Emergência.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
