"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { EASE_OUT } from "@/lib/motion"

export default function PrivacyPolicyPage() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_OUT },
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
              Privacy Policy
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
            <h2>Introduction</h2>
            <p>
              Luminum Agency ("we," "our," or "us") respects your privacy and is committed to protecting it through our
              compliance with this policy. This Privacy Policy describes the types of information we may collect from
              you or that you may provide when you visit our website and our practices for collecting, using,
              maintaining, protecting, and disclosing that information.
            </p>

            <h2>Information We Collect</h2>
            <p>We collect several types of information from and about users of our website, including information:</p>
            <ul>
              <li>
                By which you may be personally identified, such as name, email address, telephone number ("personal
                information");
              </li>
              <li>
                That is about you but individually does not identify you, such as your internet connection, the
                equipment you use to access our website, and usage details;
              </li>
              <li>About your internet connection, the equipment you use to access our website, and usage details.</li>
            </ul>

            <h2>How We Collect Your Information</h2>
            <p>We collect this information:</p>
            <ul>
              <li>
                Directly from you when you provide it to us, such as when you fill out contact forms or subscribe to our
                newsletter;
              </li>
              <li>
                Automatically as you navigate through the site, which may include usage details, IP addresses, and
                information collected through cookies and other tracking technologies;
              </li>
              <li>From third parties, for example, our business partners.</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>
              We use information that we collect about you or that you provide to us, including any personal
              information:
            </p>
            <ul>
              <li>To present our website and its contents to you;</li>
              <li>To provide you with information, products, or services that you request from us;</li>
              <li>To fulfill any other purpose for which you provide it;</li>
              <li>
                To carry out our obligations and enforce our rights arising from any contracts entered into between you
                and us;
              </li>
              <li>To notify you about changes to our website or any products or services we offer;</li>
              <li>In any other way we may describe when you provide the information;</li>
              <li>For any other purpose with your consent.</li>
            </ul>

            <h2>Disclosure of Your Information</h2>
            <p>
              We may disclose aggregated information about our users, and information that does not identify any
              individual, without restriction. We may disclose personal information that we collect or you provide as
              described in this privacy policy:
            </p>
            <ul>
              <li>To our subsidiaries and affiliates;</li>
              <li>To contractors, service providers, and other third parties we use to support our business;</li>
              <li>
                To a buyer or other successor in the event of a merger, divestiture, restructuring, reorganization,
                dissolution, or other sale or transfer of some or all of our assets;
              </li>
              <li>To fulfill the purpose for which you provide it;</li>
              <li>For any other purpose disclosed by us when you provide the information;</li>
              <li>With your consent.</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We have implemented measures designed to secure your personal information from accidental loss and from
              unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on
              secure servers behind firewalls.
            </p>
            <p>
              Unfortunately, the transmission of information via the internet is not completely secure. Although we do
              our best to protect your personal information, we cannot guarantee the security of your personal
              information transmitted to our website. Any transmission of personal information is at your own risk.
            </p>

            <h2>Changes to Our Privacy Policy</h2>
            <p>
              It is our policy to post any changes we make to our privacy policy on this page. If we make material
              changes to how we treat our users' personal information, we will notify you through a notice on the
              website home page. The date the privacy policy was last revised is identified at the top of the page.
            </p>

            <h2>Contact Information</h2>
            <p>To ask questions or comment about this privacy policy and our privacy practices, contact us at:</p>
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
