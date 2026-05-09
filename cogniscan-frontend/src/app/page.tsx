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

export default function Home() {
  return (
    <>
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
