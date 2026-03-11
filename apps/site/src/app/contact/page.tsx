import Header from "@/components/header"
import ContactHero from "@/components/contact/contact-hero"
import ContactForm from "@/components/contact/contact-form"
import ContactInfo from "@/components/contact/contact-info"
import ContactFAQ from "@/components/contact/contact-faq"
import Footer from "@/components/footer"

export default function ContactPage() {
  return (
    <>
     
      <ContactHero />
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <ContactForm />
            <ContactInfo />
          </div>
        </div>
      </div>
      <ContactFAQ />
 
    </>
  )
}
