import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.ADMIN_EMAIL
      if (!allowed) return false
      return user.email === allowed
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
})
