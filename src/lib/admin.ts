export const ADMIN_EMAILS = [
  "orivaturi22@gmail.com",
  "batatakara@gmail.com",
] as const;

export const isAdminEmail = (email?: string | null): boolean =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);

export const TOTAL_LEVELS = 10000;
