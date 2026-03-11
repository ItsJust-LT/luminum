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

interface OwnerInvitationEmailProps {
  name: string
  organizationName: string
  invitationLink: string
  invitedBy: string
}

export const OwnerInvitationEmail = ({
  name,
  organizationName,
  invitationLink,
  invitedBy
}: OwnerInvitationEmailProps) => {
  const previewText = `You've been invited to become the owner of ${organizationName} on Luminum Agency`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img src="https://luminum.agency/logo.png" width="120" height="auto" alt="Luminum Agency" style={logo} />
          </Section>
          
          <Heading style={h1}>Welcome to {organizationName}!</Heading>
          
          <Text style={heroText}>
            Hi {name},
          </Text>
          
          <Text style={text}>
            <strong>{invitedBy}</strong> has invited you to become the owner of <strong>{organizationName}</strong> on Luminum Agency, our professional digital solutions platform.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎉 What This Means</Text>
            <Text style={highlightText}>
              You're being granted full ownership of this organization, giving you complete control over your digital presence and business operations.
            </Text>
          </Section>

          <Text style={sectionTitle}>As the owner, you'll have access to:</Text>
          
          <Section style={benefitsList}>
            <Text style={benefitItem}>🏢 Complete administrative control over {organizationName}</Text>
            <Text style={benefitItem}>👥 Ability to manage all team members and permissions</Text>
            <Text style={benefitItem}>⚙️ Full control over organization settings and preferences</Text>
            <Text style={benefitItem}>📊 Access to all projects, analytics, and resources</Text>
            <Text style={benefitItem}>💳 Billing and subscription management</Text>
            <Text style={benefitItem}>🔒 Security settings and access controls</Text>
          </Section>

          <Section style={ctaBox}>
            <Text style={ctaTitle}>Ready to get started?</Text>
            <Text style={ctaText}>
              Click the button below to accept ownership and create your account. You'll be able to start managing your organization immediately.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={invitationLink}>
                Accept Ownership & Create Account
              </Button>
            </Section>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>📋 Next Steps</Text>
            <Text style={infoText}>
              After accepting ownership, you'll be able to:
            </Text>
            <Text style={infoItem}>1. Set up your organization profile and branding</Text>
            <Text style={infoItem}>2. Invite team members and assign roles</Text>
            <Text style={infoItem}>3. Configure your subscription and billing</Text>
            <Text style={infoItem}>4. Start building your digital presence</Text>
          </Section>

          <Text style={text}>
            If you're unable to click the button above, copy and paste the following link into your browser:
          </Text>
          <Link href={invitationLink} style={link}>
            {invitationLink}
          </Link>

          <Text style={footerText}>
            This invitation will expire in 7 days. If you have any questions or need assistance, please don't hesitate to contact our support team at support@luminum.agency.
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

export default OwnerInvitationEmail

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

const link = {
  color: "#2563eb",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
}

const highlightBox = {
  margin: "24px 0",
  padding: "20px",
  backgroundColor: "#f0f9ff",
  border: "1px solid #0ea5e9",
  borderRadius: "12px",
  borderLeft: "4px solid #0ea5e9",
}

const highlightTitle = {
  color: "#0c4a6e",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
}

const highlightText = {
  color: "#0c4a6e",
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
