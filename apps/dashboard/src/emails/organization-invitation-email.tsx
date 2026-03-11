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

export interface SendOrganizationInvitationEmailProps {
  email: string
  invitedByUsername: string
  invitedByEmail: string
  teamName: string
  inviteLink: string
  role?: "admin" | "member"
  organizationName?: string
  userExists?: boolean
}

export const OrganizationInvitationEmail = ({
  email,
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
  role = "member",
  organizationName,
  userExists = true,
}: SendOrganizationInvitationEmailProps) => {
  const orgName = organizationName || teamName
  const previewText = userExists 
    ? `You've been invited to join ${orgName} on Luminum Agency`
    : `Join ${orgName} on Luminum Agency - Create your account and start collaborating`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img src="https://luminum.agency/logo.png" width="120" height="auto" alt="Luminum Agency" style={logo} />
          </Section>
          
          <Heading style={h1}>
            {userExists ? `You're Invited to ${orgName}!` : `Join ${orgName} on Luminum Agency`}
          </Heading>
          
          <Text style={heroText}>
            Hi there,
          </Text>
          
          <Text style={text}>
            <strong>{invitedByUsername}</strong> has invited you to join <strong>{orgName}</strong> on Luminum Agency, our professional digital solutions platform.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎉 What This Means</Text>
            <Text style={highlightText}>
              You're being invited to join this organization as a <strong>{role}</strong>, giving you access to collaborate with the team and contribute to exciting projects.
            </Text>
          </Section>

          <Text style={sectionTitle}>As a {role}, you'll have access to:</Text>
          
          <Section style={benefitsList}>
            {role === "admin" ? (
              <>
                <Text style={benefitItem}>👥 Manage team members and their permissions</Text>
                <Text style={benefitItem}>⚙️ Configure organization settings and preferences</Text>
                <Text style={benefitItem}>📊 Access to all projects, analytics, and resources</Text>
                <Text style={benefitItem}>💳 Billing and subscription management</Text>
                <Text style={benefitItem}>🔒 Security settings and access controls</Text>
                <Text style={benefitItem}>📝 Create and manage projects and forms</Text>
              </>
            ) : (
              <>
                <Text style={benefitItem}>📝 Create and manage your own projects and forms</Text>
                <Text style={benefitItem}>📊 View analytics and performance metrics</Text>
                <Text style={benefitItem}>👥 Collaborate with team members on shared projects</Text>
                <Text style={benefitItem}>🔧 Access to organization tools and resources</Text>
                <Text style={benefitItem}>📱 Manage your profile and preferences</Text>
                <Text style={benefitItem}>💬 Participate in team discussions and updates</Text>
              </>
            )}
          </Section>

          <Section style={ctaBox}>
            <Text style={ctaTitle}>Ready to get started?</Text>
            <Text style={ctaText}>
              {userExists 
                ? "Click the button below to accept your invitation and join the organization. You'll be able to start collaborating immediately."
                : "Click the button below to create your account and join the organization. You'll be able to start collaborating immediately."
              }
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={inviteLink}>
                {userExists ? "Accept Invitation" : "Create Account & Join"}
              </Button>
            </Section>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>📋 Next Steps</Text>
            <Text style={infoText}>
              After {userExists ? "accepting your invitation" : "creating your account"}, you'll be able to:
            </Text>
            <Text style={infoItem}>1. Access the organization dashboard and projects</Text>
            <Text style={infoItem}>2. {role === "admin" ? "Manage team members and settings" : "Start creating your first project"}</Text>
            <Text style={infoItem}>3. Explore analytics and performance insights</Text>
            <Text style={infoItem}>4. Collaborate with your team members</Text>
          </Section>

          <Text style={text}>
            If you're unable to click the button above, copy and paste the following link into your browser:
          </Text>
          <Link href={inviteLink} style={link}>
            {inviteLink}
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

export default OrganizationInvitationEmail
