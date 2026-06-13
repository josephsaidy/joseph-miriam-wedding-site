import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const rsvpSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  attendance: z.enum(["yes", "no"], { required_error: "Please let us know if you can make it" }),
  guests: z.coerce.number().min(0, "Must be at least 0").max(10, "Please contact us for large groups"),
  message: z.string().optional(),
});

type RSVPFormValues = z.infer<typeof rsvpSchema>;

export default function RSVP() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RSVPFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      fullName: "",
      guests: 1,
      message: "",
    },
  });

  const onSubmit = (data: RSVPFormValues) => {
    // TODO: Connect to backend (Google Sheets, Supabase, EmailJS, etc.)
    console.log("RSVP Data:", data);
    setSubmitted(true);
  };

  return (
    <section id="rsvp" className="py-24 md:py-32 bg-secondary text-secondary-foreground relative">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-card text-card-foreground p-10 md:p-16 rounded-xl shadow-xl border border-border"
        >
          {submitted ? (
            <div className="text-center py-12 space-y-6">
              <h3 className="text-4xl font-serif text-primary italic">Thank You!</h3>
              <p className="text-lg text-muted-foreground font-light">
                Your RSVP has been received.<br/>
                We can't wait to celebrate with you.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-4 mb-12">
                <span className="uppercase tracking-[0.2em] text-sm text-primary">Join Us</span>
                <h2 className="text-4xl md:text-5xl font-serif">RSVP</h2>
                <p className="text-muted-foreground font-light">Please respond by July 2nd, 2026</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" className="border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attendance"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Will you attend?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col sm:flex-row gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-serif text-lg font-normal cursor-pointer">
                                Joyfully Accepts
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-serif text-lg font-normal cursor-pointer">
                                Regretfully Declines
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Number of Guests (including yourself)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="10" className="border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg w-24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Message / Dietary Restrictions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Leave a note for the couple..." 
                            className="resize-none border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-6">
                    <button
                      type="submit"
                      className="w-full bg-foreground text-background font-serif py-4 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg"
                    >
                      Send RSVP
                    </button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
