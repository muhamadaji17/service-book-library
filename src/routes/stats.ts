import express from 'express';
import { prisma } from '../../lib/prisma.js';
import { auth, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const userBooks = await prisma.userBook.findMany({
      where: { userId }
    });

    const totalBooks = userBooks.length;
    const totalFinished = userBooks.filter(b => b.status === "FINISHED").length;
    const totalReading = userBooks.filter(b => b.status === "CURRENTLY_READING").length;
    const totalWantToRead = userBooks.filter(b => b.status === "WANT_TO_READ").length;
    const totalDNF = userBooks.filter(b => b.status === "DNF").length;
    
    const totalPagesRead = userBooks.reduce((sum, b) => sum + b.currentPage, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let finishedThisMonth = 0;
    let finishedThisYear = 0;
    let readingDaysSum = 0;
    let readingDaysCount = 0;

    for (const book of userBooks) {
      if (book.status === "FINISHED" && book.finishDate) {
        const finishDate = new Date(book.finishDate);
        if (finishDate.getFullYear() === currentYear) {
          finishedThisYear++;
          if (finishDate.getMonth() === currentMonth) {
            finishedThisMonth++;
          }
        }

        if (book.startDate) {
          const start = new Date(book.startDate);
          const diffTime = Math.abs(finishDate.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          readingDaysSum += diffDays;
          readingDaysCount++;
        }
      }
    }

    const averageReadingDays = readingDaysCount > 0 ? Math.round(readingDaysSum / readingDaysCount) : 0;

    res.json({
      totalBooks,
      totalFinished,
      totalReading,
      totalWantToRead,
      totalDNF,
      totalPagesRead,
      finishedThisMonth,
      finishedThisYear,
      averageReadingDays
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/goal', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentYear = new Date().getFullYear();
    const finishedBooks = await prisma.userBook.findMany({
      where: { 
        userId, 
        status: "FINISHED",
        finishDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1)
        }
      }
    });

    res.json({
      readingGoal: user.readingGoal,
      progress: finishedBooks.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/goal', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { goal } = req.body;

    if (typeof goal !== 'number' || goal < 0) {
      return res.status(400).json({ error: 'Invalid goal' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { readingGoal: goal }
    });

    res.json({ readingGoal: user.readingGoal });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
