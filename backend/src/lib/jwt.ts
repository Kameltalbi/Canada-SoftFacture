import jwt from 'jsonwebtoken';

export type UserRoleJwt = 'SUPERADMIN' | 'ADMIN' | 'USER';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRoleJwt;
  organizationId: string | null;
};

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET manquant ou trop court (min 16 car.)');
  return s;
};

export function signToken(payload: JwtPayload, expiresInSeconds = 60 * 60 * 24 * 7): string {
  return jwt.sign(payload, secret(), { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret()) as JwtPayload;
}
