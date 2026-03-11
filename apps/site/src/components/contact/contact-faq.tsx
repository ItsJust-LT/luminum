"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

export default function ContactFAQ() {
  const [isVisible, setIsVisible] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const faqs = [
    {
      question: "How long does a typical project take?",
      answer:
        "Project timelines vary based on complexity. A simple website typically takes 2-3 weeks, while more complex projects with custom features can take 6-8 weeks. We'll provide a detailed timeline during our initial consultation.",
    },
    {
      question: "What is your pricing structure?",
      answer:
        "We offer flexible pricing based on your specific needs. Our packages start from R5,999 for basic websites. We provide transparent quotes with no hidden fees after understanding your requirements.",
    },
    {
      question: "Do you offer ongoing support and maintenance?",
      answer:
        "Yes! All our packages include initial support, and we offer ongoing maintenance plans to keep your website secure, updated, and performing optimally. We're here for the long term.",
    },
    {
      question: "Can you help with existing websites?",
      answer:
        "We can redesign, optimize, or add new features to existing websites. We'll assess your current site and recommend the best approach to achieve your goals.",
    },
    {
      question: "What makes Luminum Agency different?",
      answer:
        "We're not just developers—we're partners in your success. Our passion-driven approach, transparent communication, and commitment to delivering results set us apart. Plus, we genuinely care about every project.",
    },
    {
      question: "Do you work with international clients?",
      answer:
        "Yes! While we're based in South Africa, we serve clients globally. We use modern communication tools to ensure seamless collaboration regardless of location or time zone.",
    },
  ]

  return (
    <section ref={sectionRef} className="relative bg-gradient-to-br from-slate-50 to-white py-20 md:py-32 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-slate-600">
            Got questions? We've got answers. Can't find what you're looking for? Reach out directly!
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl border-2 border-slate-200 overflow-hidden transition-all duration-700 hover:border-[#302cff]/30 hover:shadow-lg ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-slate-50 transition-colors duration-300"
              >
                <h3 className="text-lg md:text-xl font-bold text-slate-900 pr-4">{faq.question}</h3>
                <ChevronDown
                  className={`flex-shrink-0 w-6 h-6 text-[#302cff] transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-500 ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 md:px-8 pb-6 md:pb-8">
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
