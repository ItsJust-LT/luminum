import { appInvite } from "@better-auth-kit/app-invite"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { organization } from "better-auth/plugins"
import { jwt } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  experimental: {
    joins: true,
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
    }),
    organization({
      allowUserToCreateOrganization: async (user) => {
        return user.role === "admin"
      },
      organizationLimit: 10,
      membershipLimit: 100,
      invitationExpiresIn: 7 * 24 * 60 * 60,
      schema: {
        organizationMember: {
          modelName: "member",
        },
        invitation: {
          modelName: "invitation",
        },
      },
    }),
    appInvite({
      invitationExpiresIn: 7 * 24 * 60 * 60,
      allowUserToCreateInvitation: true,
    }) as any,
    nextCookies(),
  ],
})
