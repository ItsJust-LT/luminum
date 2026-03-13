import { appInvite } from "@better-auth-kit/app-invite";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import { prisma } from "../lib/prisma.js";
import {
  sendAppInvitation,
  sendEmailVerification,
  sendPasswordReset,
  sendOrganizationInvitation,
} from "../lib/email.js";
import { notifyNewUserRegistration } from "../lib/notifications/helpers.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:4000";

export const auth = betterAuth({
  baseURL: API_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  experimental: {
    joins: true,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordReset({
        name: user.name || "User",
        email: user.email,
        resetLink: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerification({
        name: user.name || "User",
        email: user.email,
        verificationLink: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    jwt(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      hooks: {
        after: [
          {
            matcher(context: any) {
              return (
                context.path === "/sign-up/email" ||
                context.path === "/sign-in/social" ||
                context.path === "/sign-up/social"
              );
            },
            async handler(ctx: any) {
              if (ctx.data?.user && ctx.data?.user.id) {
                try {
                  await notifyNewUserRegistration(
                    ctx.data.user.name || "Unknown",
                    ctx.data.user.email
                  );
                } catch (error) {
                  console.error("Failed to send new user notification:", error);
                }
              }
            },
          },
        ],
      },
    }),
    organization({
      allowUserToCreateOrganization: async (user) => {
        return user.role === "admin";
      },
      organizationLimit: 10,
      membershipLimit: 100,
      invitationExpiresIn: 7 * 24 * 60 * 60,
      schema: {
        organizationMember: { modelName: "member" },
        invitation: { modelName: "invitation" },
      },
      async sendInvitationEmail(data) {
        const inviteLink = `${APP_URL}/accept-org-invitation/${data.id}`;
        await sendOrganizationInvitation({
          email: data.email,
          invitedByUsername: data.inviter.user.name || "Someone",
          invitedByEmail: data.inviter.user.email,
          teamName: data.organization.name,
          inviteLink,
        });
      },
      hooks: {
        after: [
          {
            matcher(context: any) {
              return context.path === "/organization/accept-invitation";
            },
            async handler(ctx: any) {
              if (ctx.data?.user && ctx.data?.organization) {
                const { notifyMemberJoined } = await import(
                  "../lib/notifications/helpers.js"
                );
                await notifyMemberJoined(
                  ctx.data.organization.id,
                  ctx.data.user.name || "Unknown",
                  ctx.data.user.email,
                  "member"
                );
              }
            },
          },
        ],
      },
    }),
    appInvite({
      async sendInvitationEmail(data) {
        const inviteLink = `${APP_URL}/accept-invitation/${data.id}`;
        await sendAppInvitation({
          name: data.name || "User",
          email: data.email,
          invitedByUsername: data.inviter.name || "Someone",
          invitedByEmail: data.inviter.email,
          inviteLink,
        });
      },
      invitationExpiresIn: 7 * 24 * 60 * 60,
      allowUserToCreateInvitation: true,
    }) as any,
  ],
});
