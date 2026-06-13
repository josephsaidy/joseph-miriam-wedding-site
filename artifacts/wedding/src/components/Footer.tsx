export default function Footer() {
  return (
    <footer className="py-32 bg-primary/10 text-center relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10 space-y-12">
        <h2 className="text-6xl md:text-8xl font-serif text-primary italic">See you there!</h2>
        
        <div className="pt-8">
          <a 
            href="#rsvp" 
            className="inline-block bg-primary text-primary-foreground font-serif text-lg py-4 px-10 rounded-full hover:bg-foreground transition-all duration-300 shadow-md"
          >
            RSVP Now
          </a>
        </div>

        <div className="pt-24 border-t border-primary/20 max-w-sm mx-auto">
          <p className="uppercase tracking-[0.3em] text-sm text-foreground/70">
            Joseph & Miriam
          </p>
          <p className="text-sm font-serif italic mt-2 text-foreground/50">
            August 2nd, 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
