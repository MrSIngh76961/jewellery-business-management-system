import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "ReinSoft Gold | Jewellery Business, Beautifully in Control",
  description:
    "A thoughtful jewellery business management platform for gold billing, inventory, customers, karigar operations and business insights.",
};

export default function Home() {
  return <LandingPage />;
}
