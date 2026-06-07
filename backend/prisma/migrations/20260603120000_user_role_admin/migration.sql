-- Rôle ADMIN (remplace OWNER dans le code) — l'init avait SUPERADMIN, OWNER, USER.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

UPDATE "User" SET role = 'ADMIN' WHERE role = 'OWNER';
UPDATE "UserInvitation" SET role = 'ADMIN' WHERE role = 'OWNER';
