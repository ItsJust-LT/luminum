import { Resend } from "resend"
import InvitationEmail from "@/emails/invitation-email"
import WelcomeEmail from "@/emails/welcome-email"
import EmailVerificationEmail from "@/emails/email-verification-email"
import PasswordResetEmail from "@/emails/password-reset-email"
import OrganizationInvitationEmail, { SendOrganizationInvitationEmailProps } from "@/emails/organization-invitation-email"
import OwnerInvitationEmail from "@/emails/owner-invitation-email"
import MemberRemovalEmail from "@/emails/member-removal-email"

const resend = new Resend(process.env.RESEND_API_KEY)

interface AppInvitationData {
  name: string
  email: string
  invitedByUsername: string
  invitedByEmail: string
  inviteLink: string
}

interface OrganizationInvitationData {
  email: string
  invitedByUsername: string
  invitedByEmail: string
  teamName: string
  inviteLink: string
}

interface EmailVerificationData {
  name: string
  email: string
  verificationLink: string
}

interface PasswordResetData {
  name: string
  email: string
  resetLink: string
}

interface MemberRemovalData {
  memberName: string
  memberEmail: string
  organizationName: string
  removedBy: string
}

export async function sendAppInvitation(data: AppInvitationData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [data.email],
      subject: `You've been invited to join Luminum Agency`,
      react: (
        <InvitationEmail
          name={data.name}
          invitedByUsername={data.invitedByUsername}
          invitedByEmail={data.invitedByEmail}
          inviteLink={data.inviteLink}
        />
      ),
    })

    if (error) {
      console.error("Failed to send app invitation:", error)
      throw new Error("Failed to send invitation email")
    }

    console.log("App invitation sent successfully:", result?.id)
    return result
  } catch (error) {
    console.error("Error sending app invitation:", error)
    throw error
  }
}

export async function sendOrganizationInvitation(data: OrganizationInvitationData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [data.email],
      subject: `You've been invited to join ${data.teamName}`,
      react: (
        <OrganizationInvitationEmail
          email={data.email}
          invitedByUsername={data.invitedByUsername}
          invitedByEmail={data.invitedByEmail}
          teamName={data.teamName}
          inviteLink={data.inviteLink}
        />
      ),
    })

    if (error) {
      console.error("Failed to send organization invitation:", error)
      throw new Error("Failed to send organization invitation email")
    }

    console.log("Organization invitation sent successfully:", result?.id)
    return result
  } catch (error) {
    console.error("Error sending organization invitation:", error)
    throw error
  }
}

export async function sendEmailVerification(data: EmailVerificationData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [data.email],
      subject: "Verify your email address",
      react: <EmailVerificationEmail name={data.name} verificationLink={data.verificationLink} />,
    })

    if (error) {
      console.error("Failed to send email verification:", error)
      throw new Error("Failed to send verification email")
    }

    console.log("Email verification sent successfully:", result?.id)
    return result
  } catch (error) {
    console.error("Error sending email verification:", error)
    throw error
  }
}

export async function sendPasswordReset(data: PasswordResetData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [data.email],
      subject: "Reset your password",
      react: <PasswordResetEmail name={data.name} resetLink={data.resetLink} />,
    })

    if (error) {
      console.error("Failed to send password reset:", error)
      throw new Error("Failed to send password reset email")
    }

    console.log("Password reset sent successfully:", result?.id)
    return result
  } catch (error) {
    console.error("Error sending password reset:", error)
    throw error
  }
}






export async function sendInvitationEmail({
  email,
  name,
  organizationName,
  invitationLink,
  invitedBy,
}: {
  email: string
  name: string
  organizationName: string
  invitationLink: string
  invitedBy: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@luminum.agency",
      to: [email],
      subject: `You're invited to join ${organizationName}`,
      react: InvitationEmail({
        name,
      invitedByUsername: invitedBy,
        inviteLink: invitationLink,
        invitedByEmail: invitedBy,}),
    })

    if (error) {
      console.error("Failed to send invitation email:", error)
      throw new Error("Failed to send invitation email")
    }

    console.log("Invitation email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending invitation email:", error)
    throw error
  }
}

export async function sendWelcomeEmail({ email, name }: { email: string; name: string }) {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@luminum.agency",
      to: [email],
      subject: "Welcome to Luminum Agency!",
      react: WelcomeEmail({ name }),
    })

    if (error) {
      console.error("Failed to send welcome email:", error)
      throw new Error("Failed to send welcome email")
    }

    console.log("Welcome email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending welcome email:", error)
    throw error
  }
}

export async function sendEmailVerificationEmail({
  email,
  name,
  verificationLink,
}: {
  email: string
  name: string
  verificationLink: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@luminum.agency",
      to: [email],
      subject: "Verify your email address",
      react: EmailVerificationEmail({ name, verificationLink }),
    })

    if (error) {
      console.error("Failed to send email verification email:", error)
      throw new Error("Failed to send email verification email")
    }

    console.log("Email verification email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending email verification email:", error)
    throw error
  }
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetLink,
}: {
  email: string
  name: string
  resetLink: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@luminum.agency",
      to: [email],
      subject: "Reset your password",
      react: PasswordResetEmail({ name, resetLink }),
    })

    if (error) {
      console.error("Failed to send password reset email:", error)
      throw new Error("Failed to send password reset email")
    }

    console.log("Password reset email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending password reset email:", error)
    throw error
  }
}

export async function sendOrganizationInvitationEmail({
  email,
  role,
  organizationName,
  inviteLink,
  invitedByUsername,
  invitedByEmail,
  userExists,
}: {
  email: string
  role: "admin" | "member"
  organizationName: string
  inviteLink: string
  invitedByUsername: string
  invitedByEmail: string
  userExists: boolean
}) {
  try {
    const subject = userExists 
      ? `You're invited to join ${organizationName}` 
      : `Join ${organizationName} on Luminum Agency`

    const { data: result, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [email],
      subject,
      react: <OrganizationInvitationEmail 
        email={email}
        role={role}
        organizationName={organizationName}
        teamName={organizationName}
        inviteLink={inviteLink}
        invitedByUsername={invitedByUsername}
        invitedByEmail={invitedByEmail}
        userExists={userExists}
      />,
    })

    if (error) {
      console.error("Failed to send organization invitation:", error)
      throw new Error("Failed to send organization invitation email")
    }

    console.log("Organization invitation sent successfully:", result?.id)
    return result
  } catch (error) {
    console.error("Error sending organization invitation:", error)
    throw error
  }
}



export async function sendOwnerInvitationEmail({
  email,
  name,
  organizationName,
  invitationLink,
  invitedBy,
}: {
  email: string
  name: string
  organizationName: string
  invitationLink: string
  invitedBy: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@luminum.agency",
      to: [email],
      subject: `You've been invited to own ${organizationName}`,
      react: OwnerInvitationEmail({
        name,
        organizationName,
        invitationLink,
        invitedBy,
      }),
    })

    if (error) {
      console.error("Failed to send owner invitation email:", error)
      throw new Error("Failed to send owner invitation email")
    }

    console.log("Owner invitation email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending owner invitation email:", error)
    throw error
  }
}

export async function sendMemberRemovalEmail({
  memberName,
  memberEmail,
  organizationName,
  removedBy,
}: MemberRemovalData) {
  try {
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`
    
    const { data, error } = await resend.emails.send({
      from: "Luminum Agency <noreply@luminum.agency>",
      to: [memberEmail],
      subject: `You have been removed from ${organizationName}`,
      react: MemberRemovalEmail({
        memberName,
        organizationName,
        removedBy,
        dashboardLink,
      }),
    })

    if (error) {
      console.error("Failed to send member removal email:", error)
      throw new Error("Failed to send member removal email")
    }

    console.log("Member removal email sent successfully:", data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending member removal email:", error)
    throw error
  }
}
