import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

interface WelcomeEmailProps {
  name: string
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Luminum Agency!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <div style={logo}>L</div>
        </Section>

        <Heading style={h1}>Welcome to Luminum Agency!</Heading>
        <Text style={subtitle}>Your journey to professional digital solutions begins here</Text>

        <Text style={text}>Hello {name},</Text>

        <Text style={text}>
          Welcome to Luminum Agency! We're thrilled to have you join our community of professionals who are transforming
          the digital landscape.
        </Text>

        <Section style={featuresBox}>
          <div style={featureItem}>
            <div style={featureIcon}></div>
            <Text style={featureText}>Access to premium digital tools and resources</Text>
          </div>
          <div style={featureItem}>
            <div style={featureIcon}></div>
            <Text style={featureText}>Professional project management capabilities</Text>
          </div>
          <div style={featureItem}>
            <div style={featureIcon}></div>
            <Text style={featureText}>Collaboration with industry experts</Text>
          </div>
          <div style={featureItem}>
            <div style={featureIcon}></div>
            <Text style={featureText}>24/7 support from our dedicated team</Text>
          </div>
        </Section>

        <Text style={text}>
          Ready to get started? Access your dashboard and explore all the features we have to offer.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`}>
            Go to Dashboard
          </Button>
        </Section>

        <Text style={text}>
          If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to
          help you succeed!
        </Text>

        <Section style={footer}>
          <Text style={footerCopyright}>© 2024 Luminum Agency. All rights reserved.</Text>
          <Text style={footerTagline}>Professional digital solutions for modern businesses.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginTop: "40px",
  marginBottom: "40px",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  maxWidth: "600px",
}

const logoContainer = {
  textAlign: "center" as const,
  marginBottom: "32px",
}

const logo = {
  width: "64px",
  height: "64px",
  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  borderRadius: "12px",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: "24px",
  fontWeight: "bold",
}

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
}

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  textAlign: "center" as const,
  margin: "0 0 32px 0",
}

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
}

const featuresBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
}

const featureItem = {
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
}

const featureIcon = {
  width: "24px",
  height: "24px",
  backgroundColor: "#3b82f6",
  borderRadius: "50%",
  marginRight: "12px",
  flexShrink: 0,
}

const featureText = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
}

const footer = {
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e5e7eb",
  textAlign: "center" as const,
}

const footerCopyright = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 4px 0",
}

const footerTagline = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
}

export default WelcomeEmail
