import {
  Navbar,
  Hero,
  Stats,
  HowItWorks,
  Features,
  DualAudience,
  Crisis,
  FAQ,
  Footer,
} from "@/components/landing";
import LandingScrollReset from "@/components/landing/LandingScrollReset";

export default function Home() {
  return (
    <>
      <LandingScrollReset />
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <DualAudience />
      <Crisis />
      <FAQ />
      <Footer />
    </>
  );
}
