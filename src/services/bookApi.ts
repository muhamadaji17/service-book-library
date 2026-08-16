import axios from 'axios';

export const searchByISBN = async (isbn: string) => {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  try {
    // Try Open Library first
    const olResponse = await axios.get(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    const olData = olResponse.data;

    if (olData) {
      let authorName = 'Unknown Author';

      // Try to get author from the edition's authors array
      if (olData.authors && olData.authors.length > 0) {
        try {
          const authorKey = olData.authors[0].key;
          const authorResponse = await axios.get(`https://openlibrary.org${authorKey}.json`);
          authorName = authorResponse.data.name || authorName;
        } catch (e) {
          // ignore
        }
      }

      // If still unknown, try the works endpoint for author info
      if (authorName === 'Unknown Author' && olData.works && olData.works.length > 0) {
        try {
          const workKey = olData.works[0].key;
          const workResponse = await axios.get(`https://openlibrary.org${workKey}.json`);
          const workData = workResponse.data;
          if (workData.authors && workData.authors.length > 0) {
            const authorKey = workData.authors[0].author?.key || workData.authors[0].key;
            if (authorKey) {
              const authorResponse = await axios.get(`https://openlibrary.org${authorKey}.json`);
              authorName = authorResponse.data.name || authorName;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Also try by_statement as a last resort
      if (authorName === 'Unknown Author' && olData.by_statement) {
        authorName = olData.by_statement.replace(/^by\s+/i, '').replace(/[.;,]$/, '').trim();
      }

      return {
        isbn: cleanIsbn,
        title: olData.title,
        author: authorName,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
        publisher: olData.publishers ? olData.publishers[0] : null,
        publishedYear: olData.publish_date ? parseInt(olData.publish_date.match(/\d{4}/)?.[0] || '0') || null : null,
        pageCount: olData.number_of_pages || null,
        description: olData.description?.value || olData.description || null,
      };
    }
  } catch (e) {
    // Fallback to Google Books
    try {
      const gbResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const gbData = gbResponse.data;

      if (gbData.items && gbData.items.length > 0) {
        const volumeInfo = gbData.items[0].volumeInfo;
        
        return {
          isbn: cleanIsbn,
          title: volumeInfo.title,
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
          coverUrl: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          publisher: volumeInfo.publisher || null,
          publishedYear: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).getFullYear() : null,
          pageCount: volumeInfo.pageCount || null,
          description: volumeInfo.description || null,
        };
      }
    } catch (err) {
      // both failed
    }
  }

  return null;
};
