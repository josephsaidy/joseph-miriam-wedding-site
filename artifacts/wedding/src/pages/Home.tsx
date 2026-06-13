import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Countdown from "@/components/Countdown";
import Story from "@/components/Story";
import Schedule from "@/components/Schedule";
import GettingThere from "@/components/GettingThere";
import RSVP from "@/components/RSVP";
import Contributions from "@/components/Contributions";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="w-full relative bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Countdown />
        <Story />
        <Schedule />
        <GettingThere />
        <RSVP />
        <Contributions />
      </main>
      <Footer />
      
      {/* Floating RSVP Button for Mobile */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center md:hidden pointer-events-none px-4">
        <a 
          href="#rsvp" 
          className="pointer-events-auto bg-primary text-primary-foreground font-serif text-lg py-3 px-8 rounded-full shadow-lg shadow-black/10 tracking-widest uppercase transition-transform active:scale-95"
        >
          RSVP
        </a>
      </div>
    </div>
  );
}
