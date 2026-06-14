import { motion } from "framer-motion";

export default function GettingThere() {
  const basePath = import.meta.env.BASE_URL;

  return (
    <section id="location" className="py-24 md:py-32 bg-background text-center">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="space-y-12"
        >
          <div className="space-y-4">
            <span className="uppercase tracking-[0.2em] text-sm text-primary">
              Directions
            </span>
            <h2 className="text-4xl md:text-5xl font-serif">Getting There</h2>
          </div>

          <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-xl shadow-lg mb-0">
            <img
              src={`${basePath}images/hotel-massabki.webp`}
              alt="Massabki Hotel, Chtoura"
              className="w-full h-64 object-cover"
              style={{ objectPosition: "62% 45%" }}
            />
          </div>

          <div className="bg-card text-card-foreground p-10 md:p-16 rounded-b-xl rounded-t-none shadow-lg border border-border border-t-0 inline-block w-full max-w-2xl text-left">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-serif mb-2">Massabki Hotel</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  1802 Damascus Hwy
                  <br />
                  Chtaura, Beqaa Governorate
                  <br />
                  Lebanon
                </p>
              </div>

              <div>
                <h4 className="text-sm uppercase tracking-widest text-primary mb-2">
                  Parking
                </h4>
                <p className="text-muted-foreground font-light">
                  Many parking spots are available on the sides and back of the hotel.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="https://maps.app.goo.gl/i3Y7y7y5HGkTJv5v8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-foreground text-background font-serif py-4 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  Open in Google Maps
                </a>

                <a
                  href="#rsvp"
                  className="flex-1 text-center border border-foreground text-foreground font-serif py-4 px-6 hover:bg-foreground hover:text-background transition-all duration-300"
                >
                  RSVP Now
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}