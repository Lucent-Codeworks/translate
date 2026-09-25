import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { count } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

const allowPublicSignup = process.env.ALLOW_PUBLIC_SIGNUP === "true";

export async function hasAnyUser() {
  const [row] = await db.select({ n: count() }).from(schema.user);
  return row.n > 0;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        // Self-hosting bootstrap: the very first account becomes the instance
        // admin. After that, only admins can create users (via the admin
        // plugin) unless ALLOW_PUBLIC_SIGNUP is set.
        before: async (user, ctx) => {
          if (!(await hasAnyUser())) {
            return { data: { ...user, role: "admin" } };
          }
          if (ctx?.path?.startsWith("/sign-up") && !allowPublicSignup) {
            throw new APIError("FORBIDDEN", {
              message: "Sign-up is disabled. Ask an administrator for an account.",
            });
          }
        },
      },
    },
  },
  // nextCookies must be the last plugin.
  plugins: [admin(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
