import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, AuthRequest } from '../middleware/auth.js';
import { searchByISBN } from '../services/bookApi.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/search', async (req: AuthRequest, res) => {
  const { isbn } = req.query;
  if (!isbn || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'ISBN is required' });
  }

  const bookData = await searchByISBN(isbn);
  if (!bookData) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(bookData);
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { isbn, title, author, coverUrl, publisher, publishedYear, pageCount, description, status } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const userId = req.user!.id;

    // Create or find book
    let book;
    if (isbn) {
      book = await prisma.book.findUnique({ where: { isbn } });
    }
    
    if (!book) {
      book = await prisma.book.create({
        data: {
          isbn: isbn || null,
          title,
          author,
          coverUrl,
          publisher,
          publishedYear,
          pageCount,
          description,
        }
      });
    }

    const existingUserBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: { userId, bookId: book.id }
      }
    });

    if (existingUserBook) {
      return res.status(400).json({ error: 'Book already in your library' });
    }

    const validStatuses = ["WANT_TO_READ", "CURRENTLY_READING", "FINISHED", "DNF"];
    const initialStatus = validStatuses.includes(status) ? status : "WANT_TO_READ";
    const startDate = initialStatus === "CURRENTLY_READING" ? new Date() : null;

    const userBook = await prisma.userBook.create({
      data: {
        userId,
        bookId: book.id,
        status: initialStatus,
        startDate
      },
      include: {
        book: true
      }
    });

    res.json(userBook);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { search, status, sort, order } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = String(status);
    }
    if (search) {
      where.book = {
        OR: [
          { title: { contains: String(search) } },
          { author: { contains: String(search) } }
        ]
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    const sortField = String(sort);
    const sortOrder = String(order) === 'asc' ? 'asc' : 'desc';

    if (sortField === 'title' || sortField === 'author') {
      orderBy = { book: { [sortField]: sortOrder } };
    } else if (sortField === 'createdAt' || sortField === 'finishDate') {
      orderBy = { [sortField]: sortOrder };
    }

    const userBooks = await prisma.userBook.findMany({
      where,
      include: { book: true },
      orderBy
    });

    res.json(userBooks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId },
      include: {
        book: true,
        readingSessions: {
          orderBy: { readingDate: 'desc' }
        }
      }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(userBook);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId },
      include: { book: true }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { title, author, isbn, coverUrl, publisher, publishedYear, pageCount, description } = req.body;
    
    const updatedBook = await prisma.book.update({
      where: { id: userBook.bookId },
      data: { title, author, isbn, coverUrl, publisher, publishedYear, pageCount, description }
    });

    res.json({ ...userBook, book: updatedBook });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    await prisma.userBook.delete({ where: { id: userBook.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/status', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId },
      include: { book: true }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { status, startDate, targetFinishDate } = req.body;
    const validStatuses = ["WANT_TO_READ", "CURRENTLY_READING", "FINISHED", "DNF"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const data: any = { status };
    if (startDate) data.startDate = new Date(startDate);
    if (targetFinishDate) data.targetFinishDate = new Date(targetFinishDate);

    if (status === "CURRENTLY_READING" && !userBook.startDate && !startDate) {
      data.startDate = new Date();
    } else if (status === "FINISHED") {
      data.progress = 100;
      data.currentPage = userBook.book.pageCount || userBook.currentPage;
      if (!userBook.finishDate) {
        data.finishDate = new Date();
      }
    }

    const updated = await prisma.userBook.update({
      where: { id: userBook.id },
      data
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/progress', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId },
      include: { book: true }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { currentPage, notes } = req.body;
    
    if (typeof currentPage !== 'number') {
      return res.status(400).json({ error: 'Invalid currentPage' });
    }

    const pageCount = userBook.book.pageCount || Math.max(currentPage, 1);
    const progress = Math.min((currentPage / pageCount) * 100, 100);

    const pagesRead = Math.max(0, currentPage - userBook.currentPage);

    const updated = await prisma.userBook.update({
      where: { id: userBook.id },
      data: { currentPage, progress }
    });

    if (pagesRead > 0 || notes) {
      await prisma.readingSession.create({
        data: {
          userBookId: userBook.id,
          pagesRead,
          notes: notes || null
        }
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/finish', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId },
      include: { book: true }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { finishDate, rating, summary, lessons, favoriteQuote, personalOpinion } = req.body;
    
    let parsedFinishDate = finishDate ? new Date(finishDate) : new Date();
    
    if (userBook.startDate && parsedFinishDate < userBook.startDate) {
      return res.status(400).json({ error: 'Finish date cannot be before start date' });
    }

    const updated = await prisma.userBook.update({
      where: { id: userBook.id },
      data: {
        status: "FINISHED",
        progress: 100,
        currentPage: userBook.book.pageCount || userBook.currentPage,
        finishDate: parsedFinishDate,
        rating,
        summary,
        lessons,
        favoriteQuote,
        personalOpinion
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/notes', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userBook = await prisma.userBook.findFirst({
      where: { id: req.params.id, userId }
    });

    if (!userBook) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { summary, lessons, favoriteQuote, personalOpinion, notes, rating } = req.body;
    
    const updated = await prisma.userBook.update({
      where: { id: userBook.id },
      data: { summary, lessons, favoriteQuote, personalOpinion, notes, rating }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
