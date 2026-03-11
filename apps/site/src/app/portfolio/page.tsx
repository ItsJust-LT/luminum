"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function PortfolioPage() {
  return (
    <section className="pt-32 pb-24 min-h-[70vh] bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-6">Private Portfolio</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Our client work stays confidential
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            We partner with teams that trust us with their most important initiatives. To respect those relationships,
            we only share results and project details during private consultations. Let us know what you’re building and
            we’ll walk you through relevant examples on a call.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-[#0B22E1] hover:bg-[#0B22E1]/90 text-white px-8">
                Book a call
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
