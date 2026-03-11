import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components"

interface PasswordResetEmailProps {
  name: string
  resetLink: string
}

export const PasswordResetEmail = ({ name, resetLink }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <div style={logo}>L</div>
        </Section>

        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={subtitle}>Secure your Luminum Agency account</Text>

        <Text style={text}>Hello {name},</Text>

        <Text style={text}>
          We received a request to reset the password for your Luminum Agency account. If you made this request, click
          the button below to create a new password.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={resetLink}>
            Reset Password
          </Button>
        </Section>

        <Section style={warningBox}>
          <Text style={warningTitle}>Security Notice</Text>
          <Text style={warningText}>
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged, and
            your account is secure.
          </Text>
        </Section>

        <Text style={linkText}>If the button doesn't work, you can copy and paste this link into your browser:</Text>
        <Link href={resetLink} style={link}>
          {resetLink}
        </Link>

        <Text style={footerText}>This password reset link will expire in 1 hour for security reasons.</Text>

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

const warningBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #f59e0b",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
}

const warningTitle = {
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 8px 0",
  fontSize: "14px",
}

const warningText = {
  color: "#92400e",
  fontSize: "14px",
  margin: "0",
  lineHeight: "1.4",
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

export default PasswordResetEmail
