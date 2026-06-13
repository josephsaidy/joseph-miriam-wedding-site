import { motion } from "framer-motion";

export default function Schedule() {
  const events = [
    {
      time: "5:00 PM",
      title: "Reception",
      location: "Massabki Hotel",
    },
    {
      time: "11:00 PM",
      title: "Farewells",
      location: "Massabki Hotel",
    }
  ];

  return (
    <section id="schedule" className="py-24 md:py-32 bg-accent text-accent-foreground text-center">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="space-y-16"
        >
          <div className="space-y-4">
            <span className="uppercase tracking-[0.2em] text-sm text-primary">The Timeline</span>
            <h2 className="text-4xl md:text-5xl font-serif">Schedule</h2>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/30 -translate-x-1/2" />
            
            <div className="space-y-16">
              {events.map((event, index) => (
                <div key={index} className="relative z-10 flex flex-col items-center">
                  <div className="bg-background w-4 h-4 rounded-full border-2 border-primary mb-6" />
                  <span className="text-primary font-serif italic text-xl mb-2">{event.time}</span>
                  <h3 className="text-2xl font-serif mb-1">{event.title}</h3>
                  <p className="text-muted-foreground uppercase tracking-widest text-xs">{event.location}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
