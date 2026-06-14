import { motion } from "framer-motion";

export default function Hero() {
  const basePath = import.meta.env.BASE_URL;

  return (
    <section
      id="home"
      className="relative min-h-screen pt-32 pb-20 flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="container mx-auto px-6 z-10 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="space-y-6"
        >
          <p className="uppercase tracking-[0.3em] text-sm text-muted-foreground">
            You're Invited To
          </p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-foreground leading-tight">
            The Wedding Party of <br />
            <span className="italic">Joseph & Miriam</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground tracking-wide font-light">
            August 2nd, 2026{" "}
            <span className="mx-3 text-primary">•</span> Bekaa, Lebanon
          </p>

          <div className="pt-8">
            <a
              href="#rsvp"
              className="inline-block bg-foreground text-background font-serif text-lg py-4 px-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-md"
            >
              RSVP Now
            </a>
          </div>
        </motion.div>

        {/* Photo Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr"
        >
          <div className="relative aspect-[3/4] md:mt-12 rounded-lg overflow-hidden shadow-xl">
            <img
              src={`${basePath}images/hero1.jpg`}
              alt="Joseph & Miriam"
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="relative aspect-[4/5] rounded-lg overflow-hidden shadow-xl">
            <img
              src={`${basePath}images/hero2.jpg`}
              alt="Joseph & Miriam"
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="relative aspect-[3/4] md:mt-24 rounded-lg overflow-hidden shadow-xl hidden md:block">
            <img
              src={`${basePath}images/hero3.jpg`}
              alt="Joseph & Miriam"
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
              style={{ objectPosition: "35% 30%" }}
            />
          </div>
        </motion.div>
      </div>

      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-background/50 pointer-events-none -z-10" />
    </section>
  );
}