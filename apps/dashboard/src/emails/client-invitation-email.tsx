import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components"

interface ClientInvitationEmailProps {
  clientName: string
  websiteName: string
  invitedByName: string
  invitedByEmail: string
  inviteLink: string
}

export const ClientInvitationEmail = ({
  clientName,
  websiteName,
  invitedByName,
  invitedByEmail,
  inviteLink,
}: ClientInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Access your website dashboard - {websiteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <div style={logo}>L</div>
        </Section>

        <Heading style={h1}>Your Website Dashboard is Ready!</Heading>
        <Text style={subtitle}>Access analytics and manage your digital presence</Text>

        <Text style={text}>Hello {clientName},</Text>

        <Section style={websiteBox}>
          <Text style={websiteLabel}>Your Website</Text>
          <Text >{websiteName}</Text>
          <Text style={websiteDescription}>Built with care by the Luminum Agency team</Text>
        </Section>

        <Text style={text}>
          We're excited to give you access to your personalized client dashboard! Here you can monitor your website's
          performance, view analytics, and stay updated on your digital presence.
        </Text>

        <Section style={featuresBox}>
          <Text style={featuresTitle}>What you can do:</Text>
          <div style={featureItem}>
            <Text style={featureText}>📊 View website analytics and visitor stats</Text>
          </div>
          <div style={featureItem}>
            <Text style={featureText}>🚀 Monitor website performance and uptime</Text>
          </div>
          <div style={featureItem}>
            <Text style={featureText}>📈 Track conversion rates and user engagement</Text>
          </div>
          <div style={featureItem}>
            <Text style={featureText}>💬 Request updates and communicate with our team</Text>
          </div>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={inviteLink}>
            Access Your Dashboard
          </Button>
        </Section>

        <Text style={linkText}>If the button doesn't work, you can copy and paste this link into your browser:</Text>
        <Link href={inviteLink} style={link}>
          {inviteLink}
        </Link>

        <Text style={footerText}>
          This invitation will expire in 7 days. If you have any questions, feel free to reach out to our team.
        </Text>

        <Section style={footer}>
          <Text style={footerCopyright}>© 2024 Luminum Agency. All rights reserved.</Text>
          <Text style={footerTagline}>Professional web development for modern businesses.</Text>
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

const websiteBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
}

const websiteLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 8px 0",
}

const websiteName = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 8px 0",
}

const websiteDescription = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
}

const featuresBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
}

const featuresTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px 0",
}

const featureItem = {
  marginBottom: "12px",
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

const linkText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "24px 0 8px 0",
}

const link = {
  color: "#3b82f6",
  fontSize: "14px",
  textDecoration: "underline",
}

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "24px 0",
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

export default ClientInvitationEmail
