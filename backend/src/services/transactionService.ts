import {prisma} from '../lib/prisma';

export default function getUserTransactions(
  startDate: string,
  endDate: string,
  userPhone: string
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);

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
