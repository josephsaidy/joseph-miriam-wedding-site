import { motion } from "framer-motion";

export default function Contributions() {
  return (
    <section className="py-24 bg-background text-center">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <h2 className="text-3xl md:text-4xl font-serif">Contributions</h2>
          <div className="w-16 h-px bg-primary mx-auto" />
          <p className="text-muted-foreground font-light leading-relaxed">
            Your presence at our wedding is the greatest gift of all. For those who wish to contribute, gifts can be sent via [details to be added].
          </p>
        </motion.div>
      </div>
    </section>
  );
}
