import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface MemberRemovalEmailProps {
  memberName: string
  organizationName: string
  removedBy: string
  dashboardLink: string
}

export const MemberRemovalEmail = ({
  memberName,
  organizationName,
  removedBy,
  dashboardLink,
}: MemberRemovalEmailProps) => {
  const previewText = `You have been removed from ${organizationName} on Luminum Agency`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img src="https://luminum.agency/logo.png" width="120" height="auto" alt="Luminum Agency" style={logo} />
          </Section>
          
          <Heading style={h1}>Access Removed</Heading>
          
          <Text style={heroText}>
            Hi {memberName},
          </Text>
          
          <Text style={text}>
            You have been removed from <strong>{organizationName}</strong> on Luminum Agency by <strong>{removedBy}</strong>.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>📋 What This Means</Text>
            <Text style={highlightText}>
              Your access to {organizationName} has been revoked. You will no longer be able to access organization resources, projects, or collaborate with the team.
            </Text>
          </Section>

          <Text style={sectionTitle}>What happens next:</Text>
          
          <Section style={benefitsList}>
            <Text style={benefitItem}>🚫 You can no longer access {organizationName} resources</Text>
            <Text style={benefitItem}>📁 Your access to organization projects has been removed</Text>
            <Text style={benefitItem}>👥 You will no longer receive team notifications</Text>
            <Text style={benefitItem}>📊 Your access to organization analytics has been revoked</Text>
            <Text style={benefitItem}>🔒 All organization permissions have been removed</Text>
          </Section>

          <Section style={ctaBox}>
            <Text style={ctaTitle}>Need to get back in touch?</Text>
            <Text style={ctaText}>
              If you believe this was done in error or need to discuss your access, please contact the organization administrator or reach out to our support team.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardLink}>
                Go to Dashboard
              </Button>
            </Section>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>💡 Your Account</Text>
            <Text style={infoText}>
              Your Luminum Agency account remains active. You can still:
            </Text>
            <Text style={infoItem}>1. Access your personal dashboard</Text>
            <Text style={infoItem}>2. Join other organizations if invited</Text>
            <Text style={infoItem}>3. Create your own organization</Text>
            <Text style={infoItem}>4. Contact support for assistance</Text>
          </Section>

          <Text style={footerText}>
            If you have any questions about this change or need assistance, please don't hesitate to contact our support team at support@luminum.agency.
          </Text>

          <Section style={footer}>
            <Text style={footerCopyright}>© 2024 Luminum Agency. All rights reserved.</Text>
            <Text style={footerTagline}>Professional digital solutions for modern businesses.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default MemberRemovalEmail

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
}

const logoContainer = {
  textAlign: "center" as const,
  margin: "0 0 40px",
}

const logo = {
  margin: "0 auto",
  maxWidth: "120px",
  height: "auto",
  objectFit: "contain" as const,
}

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  margin: "16px 0",
  textAlign: "center" as const,
}

const heroText = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "16px 0",
  textAlign: "center" as const,
}

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "16px 0",
}

const benefitsList = {
  margin: "24px 0",
  padding: "20px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
}

const benefitItem = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "8px 0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const highlightBox = {
  margin: "24px 0",
  padding: "20px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fca5a5",
  borderRadius: "12px",
  borderLeft: "4px solid #ef4444",
}

const highlightTitle = {
  color: "#991b1b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
}

const highlightText = {
  color: "#991b1b",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
}

const sectionTitle = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "24px 0 16px 0",
}

const ctaBox = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  textAlign: "center" as const,
}

const ctaTitle = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px 0",
}

const ctaText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 20px 0",
}

const infoBox = {
  margin: "24px 0",
  padding: "20px",
  backgroundColor: "#f9fafb",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
}

const infoTitle = {
  color: "#374151",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
}

const infoText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
}

const infoItem = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "4px 0",
  paddingLeft: "8px",
}

const footer = {
  margin: "32px 0 0",
  padding: "20px 0",
  borderTop: "1px solid #e5e7eb",
  textAlign: "center" as const,
}

const footerCopyright = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 4px 0",
}

const footerTagline = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "1.5",
  margin: "0",
}

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "32px 0 0",
  textAlign: "center" as const,
}
