import { Hero } from "@/components/landing/hero";
import { CapabilityGrid } from "@/components/landing/capability-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TrustBar } from "@/components/landing/trust-bar";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Hero />
      <CapabilityGrid />
      <HowItWorks />
      <TrustBar />
      <Footer />
    </>
  );
}
