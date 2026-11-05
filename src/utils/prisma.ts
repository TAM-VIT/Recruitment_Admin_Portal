import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __mockPrisma: any;
}

// Students' password hashes belong to the student backend; admins never need them. This blanks
// User.passwordHash in every query result, so no admin route can send it out by accident,
// including through nested includes like application.user.
const createClient = () =>
  new PrismaClient().$extends({
    result: {
      user: {
        passwordHash: {
          needs: {},
          compute: () => undefined,
        },
      },
    },
  }) as unknown as PrismaClient;

export const prisma: PrismaClient =
  (typeof globalThis !== 'undefined' && globalThis.__mockPrisma)
    ? (globalThis.__mockPrisma as PrismaClient)
    : createClient();
