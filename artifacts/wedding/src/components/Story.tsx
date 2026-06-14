import { motion } from "framer-motion";

export default function Story() {
  const basePath = import.meta.env.BASE_URL;

  return (
    <section id="story" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 md:px-12 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="w-full md:w-1/2"
          >
            <div className="relative aspect-[4/5] rounded-t-full overflow-hidden shadow-2xl">
              <img
                src={`${basePath}images/our-story.jpg`}
                alt="Joseph & Miriam"
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 border border-primary/20 rounded-t-full m-4 pointer-events-none" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full md:w-1/2 space-y-8"
          >
            <div className="space-y-2">
              <span className="uppercase tracking-[0.2em] text-sm text-primary">
                How We Met
              </span>
              <h2 className="text-4xl md:text-5xl font-serif text-foreground">
                Our Story
              </h2>
            </div>

            <div className="space-y-6 text-muted-foreground leading-relaxed font-light">
              <p>
                Miriam and Joseph first crossed paths during a Zoom class in the
                middle of a pandemic, by pure chance. Miriam had joined Joseph's
                section after missing her own. As she asked questions throughout,
                she stood out every time she spoke.
              </p>

              <p>
                Curious, he reached out to her on Instagram, and what started as
                a simple message quickly turned into long conversations and an
                undeniable connection. Not long after, they went out together,
                and from that moment, their story truly began.
              </p>

              <p>
                What followed was a summer full of memories: countless dates,
                activities, gym sessions, laughter, and growing together day by
                day. Through every moment, they found not just love, but a best
                friend in each other, and the beginning of a lifetime side by side.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}