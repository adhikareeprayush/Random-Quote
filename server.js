const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const PORT = 3000;

let quotes = [];

// Utility: Get random elements from an array using Fisher-Yates shuffle
function getRandomItems(array, count) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Load quotes from CSV and start server *after loading is complete*
fs.createReadStream("quotes.csv")
  .pipe(csv())
  .on("data", (row) => {
    row.category = row.category.split(",").map((c) => c.trim().toLowerCase());
    quotes.push(row);
  })
  .on("end", () => {
    console.log("CSV loaded successfully. Starting server...");

    // GET filtered quotes with optional limit
    app.get("/api/quotes", (req, res) => {
      const { author, category, limit } = req.query;
      let filtered = [...quotes];

      if (author) {
        filtered = filtered.filter((q) =>
          q.author.toLowerCase().includes(author.toLowerCase())
        );
      }

      if (category) {
        filtered = filtered.filter((q) =>
          q.category.includes(category.toLowerCase())
        );
      }

      const resultLimit = Math.min(parseInt(limit) || 10, 50); // cap limit
      res.json(getRandomItems(filtered, resultLimit)); // randomize!
    });

    // GET random quotes (single or multiple)
    app.get("/api/quotes/random", (req, res) => {
      const limit = Math.min(parseInt(req.query.limit) || 1, 50);
      const randomQuotes = getRandomItems(quotes, limit);
      res.json(limit === 1 ? randomQuotes[0] : randomQuotes);
    });

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
