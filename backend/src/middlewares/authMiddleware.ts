import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtUserPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  phone: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUserPayload;

    if (!decoded.sub || !decoded.phone) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.user = { id: decoded.sub, email: decoded.email, phone: decoded.phone };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
