import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components"


interface InvitationEmailProps {
 name: string
  invitedByUsername: string
  invitedByEmail: string
  inviteLink: string
}

export const InvitationEmail = ({ name, invitedByUsername, invitedByEmail, inviteLink }: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You've been invited to join Luminum Agency</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <div style={logo}>L</div>
        </Section>

        <Heading style={h1}>You're Invited!</Heading>
        <Text style={subtitle}>Join Luminum Agency's professional platform</Text>

        <Text style={text}>Hello {name},</Text>

        <Section style={inviteBox}>
          <Text style={inviteFrom}>You've been invited by</Text>
          <Text style={inviteName}>{invitedByUsername}</Text>
          <Text style={inviteEmail}>{invitedByEmail}</Text>
        </Section>

        <Text style={text}>
          You've been invited to join Luminum Agency, a professional digital solutions platform. Click the button below
          to accept your invitation and create your account.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={inviteLink}>
            Accept Invitation
          </Button>
        </Section>

        <Text style={linkText}>If the button doesn't work, you can copy and paste this link into your browser:</Text>
        <Link href={inviteLink} style={link}>
          {inviteLink}
        </Link>

        <Text style={footerText}>
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
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

const inviteBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
}

const inviteFrom = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 8px 0",
}

const inviteName = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 4px 0",
}

const inviteEmail = {
  fontSize: "14px",
  color: "#6b7280",
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

export default InvitationEmail
