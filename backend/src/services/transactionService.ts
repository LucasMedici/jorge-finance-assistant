import jwt from 'jsonwebtoken';
import {prisma} from '../lib/prisma';



const JWT_SECRET = process.env.JWT_SECRET as string;

interface JwtUserPayload extends jwt.JwtPayload {
  phone: string;
}

export default function getUserTransactions(
  startDate: String,
  endDate: String,
  token: any
) {
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setDate(end.getDate() + 1);

  const tokenNoBearer = token.replace('Bearer ', '');
  const decodedToken = jwt.verify(tokenNoBearer, JWT_SECRET) as JwtUserPayload;
  const userPhone = decodedToken.phone;

  return prisma.transaction.findMany({
    where: {
      phone: userPhone,
      createdAt: {
        gte: start, // maior ou igual a startDate
        lte: end,   // menor ou igual a endDate
    },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
