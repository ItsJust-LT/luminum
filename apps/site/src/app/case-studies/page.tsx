"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CaseStudiesPage() {
  return (
    <section className="pt-32 pb-24 min-h-[70vh] bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-6">Case studies</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">Success stories on request</h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            We operate under strict NDAs and keep project outcomes off our marketing site. If you would like to review
            relevant case studies, let us know what you are building and we'll curate a private walkthrough tailored to
            your industry and goals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-[#0B22E1] hover:bg-[#0B22E1]/90 text-white px-8">
                Request examples
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline" className="border-slate-300 text-slate-900 px-8">
                Explore services
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
