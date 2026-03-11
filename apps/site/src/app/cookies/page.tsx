"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

export default function CookiesPage() {
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
              Cookie Policy
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
            <h2>What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit a website.
              They are widely used to make websites work more efficiently and provide information to the owners of the
              site. Cookies enhance user experience by allowing websites to remember your preferences and understand how
              you use the website.
            </p>

            <h2>How We Use Cookies</h2>
            <p>Luminum Agency uses cookies for a variety of reasons, including to:</p>
            <ul>
              <li>Make our website work as you'd expect</li>
              <li>Remember your settings during and between visits</li>
              <li>Improve the speed/security of the site</li>
              <li>Allow you to share pages with social networks like Facebook</li>
              <li>Continuously improve our website for you</li>
              <li>Make our marketing more efficient</li>
            </ul>

            <h2>Types of Cookies We Use</h2>
            <h3>Essential Cookies</h3>
            <p>
              These cookies are necessary for the website to function properly. They enable basic functions like page
              navigation and access to secure areas of the website. The website cannot function properly without these
              cookies.
            </p>

            <h3>Performance Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our website by collecting and reporting
              information anonymously. They help us understand which pages are the most and least popular and see how
              visitors move around the site.
            </p>

            <h3>Functionality Cookies</h3>
            <p>
              These cookies enable the website to provide enhanced functionality and personalization. They may be set by
              us or by third-party providers whose services we have added to our pages.
            </p>

            <h3>Targeting Cookies</h3>
            <p>
              These cookies may be set through our site by our advertising partners. They may be used by those companies
              to build a profile of your interests and show you relevant advertisements on other sites.
            </p>

            <h2>Managing Cookies</h2>
            <p>
              Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies,
              or to alert you when cookies are being sent. The methods for doing so vary from browser to browser, and
              from version to version. You can however obtain up-to-date information about blocking and deleting cookies
              via these links:
            </p>
            <ul>
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p>
              Please note that restricting cookies may impact the functionality of our website. For more information
              about cookies, visit{" "}
              <a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer">
                www.allaboutcookies.org
              </a>
              .
            </p>

            <h2>Changes to Our Cookie Policy</h2>
            <p>
              We may update our Cookie Policy from time to time. Any changes will be posted on this page and, where
              appropriate, notified to you by email or when you next visit our website.
            </p>

            <h2>Contact Information</h2>
            <p>If you have any questions about our Cookie Policy, please contact us at:</p>
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
