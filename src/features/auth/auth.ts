import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import argon2 from 'argon2';
import { connectDb } from '@/lib/mongodb';
import { User } from '@/models/User';
import { env } from '@/lib/env';
import { linkGuestData } from './link-guest';

// Lazy config: env() is only read at request time, so `next build`
// works without production secrets.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: env().AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    ...(env().GOOGLE_CLIENT_ID
      ? [Google({ clientId: env().GOOGLE_CLIENT_ID, clientSecret: env().GOOGLE_CLIENT_SECRET })]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').toLowerCase().trim();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;
        await connectDb();
        const user = await User.findOne({ email });
        if (!user?.passwordHash) return null;
        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;
        return { id: String(user._id), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) return true;
      // Upsert the Google user and remember their Mongo id for the jwt callback.
      await connectDb();
      const dbUser = await User.findOneAndUpdate(
        { email: user.email.toLowerCase() },
        {
          $setOnInsert: { email: user.email.toLowerCase(), role: 'customer' },
          $set: {
            googleId: account.providerAccountId,
            name: user.name ?? '',
            emailVerifiedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      );
      user.id = String(dbUser._id);
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        await connectDb();
        const dbUser = await User.findById(user.id);
        token.role = dbUser?.role ?? 'customer';
        // First-login housekeeping: merge guest cart, attach guest orders.
        await linkGuestData(user.id, dbUser?.email ?? '');
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
        (session.user as { role?: string }).role = String(token.role ?? 'customer');
      }
      return session;
    },
  },
}));

export type SessionUser = { id: string; email?: string | null; role?: string };

/** Current user or null; role included. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || user.role !== 'admin') throw new Error('Forbidden');
  return user;
}
