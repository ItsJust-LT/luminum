"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

export default function TermsOfServicePage() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  }

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B22E1]/10 to-blue-50 z-0"></div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge className="bg-[#0B22E1]/10 text-[#0B22E1] border-[#0B22E1]/20 mb-4">Legal</Badge>
            </motion.div>
            <motion.h1
              className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Terms of Service
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Last updated: May 25, 2023
            </motion.p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto prose prose-lg prose-blue"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2>Agreement to Terms</h2>
            <p>
              These Terms of Service constitute a legally binding agreement made between you and Luminum Agency ("we,"
              "us," or "our"), concerning your access to and use of our website and services. You agree that by
              accessing the website and/or services, you have read, understood, and agree to be bound by all of these
              Terms of Service.
            </p>
            <p>
              IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF SERVICE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE
              WEBSITE AND SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
            </p>

            <h2>Services</h2>
            <p>
              Luminum Agency provides web development, web design, and related digital services. The specific services to
              be provided will be detailed in a separate agreement or statement of work between Luminum Agency and the
              client.
            </p>

            <h2>Intellectual Property Rights</h2>
            <p>
              Unless otherwise indicated, the website and services, including all content, features, and functionality,
              are owned by Luminum Agency, its licensors, or other providers of such material and are protected by South
              African and international copyright, trademark, patent, trade secret, and other intellectual property or
              proprietary rights laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform,
              republish, download, store, or transmit any of the material on our website, except as follows:
            </p>
            <ul>
              <li>
                Your computer may temporarily store copies of such materials in RAM incidental to your accessing and
                viewing those materials.
              </li>
              <li>
                You may store files that are automatically cached by your Web browser for display enhancement purposes.
              </li>
              <li>
                You may print or download one copy of a reasonable number of pages of the website for your own personal,
                non-commercial use and not for further reproduction, publication, or distribution.
              </li>
            </ul>

            <h2>Client Responsibilities</h2>
            <p>
              Clients are responsible for providing timely and accurate information, materials, and approvals necessary
              for Luminum Agency to complete the services. Delays in providing such materials may result in project
              delays or additional costs.
            </p>

            <h2>Payment Terms</h2>
            <p>
              Payment terms will be specified in the client agreement or statement of work. Unless otherwise agreed,
              invoices are due upon receipt. Late payments may incur additional fees and/or result in suspension of
              services.
            </p>

            <h2>Project Timelines</h2>
            <p>
              Project timelines are estimates based on the scope of work and may be subject to change based on client
              responsiveness, change requests, or unforeseen technical challenges. Luminum Agency will make reasonable
              efforts to meet agreed-upon deadlines.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              IN NO EVENT WILL Luminum AGENCY, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS,
              OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN
              CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE WEBSITE, SERVICES, OR ANY CONTENT ON THE WEBSITE,
              INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>

            <h2>Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Luminum Agency, its affiliates, licensors, and service
              providers, and its and their respective officers, directors, employees, contractors, agents, licensors,
              suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards,
              losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your
              violation of these Terms of Service or your use of the website or services.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms of Service and any dispute or claim arising out of or related to them, their subject matter,
              or their formation shall be governed by and construed in accordance with the laws of South Africa, without
              giving effect to any choice or conflict of law provision or rule.
            </p>

            <h2>Changes to Terms of Service</h2>
            <p>
              We may revise and update these Terms of Service from time to time in our sole discretion. All changes are
              effective immediately when we post them. Your continued use of the website and services following the
              posting of revised Terms of Service means that you accept and agree to the changes.
            </p>

            <h2>Contact Information</h2>
            <p>Questions about the Terms of Service should be sent to us at:</p>
            <p>
              <strong>Email:</strong> <a href="mailto:contact@luminum.agency">contact@luminum.agency</a>
              <br />
              <strong>Phone:</strong> <a href="tel:0689186043">068 918 6043</a>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  )
}
