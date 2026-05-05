const {
  getQuotes,
  filterQuotes,
  sortQuotes,
  getRandomItems,
  mulberry32,
  hashSeed,
} = require("./quotesStore");
const { parseQuoteQuery } = require("./quoteQuery");

async function buildQuotesResponse(query) {
  const quotes = await getQuotes();
  const f = parseQuoteQuery(query);
  const filtered = filterQuotes(quotes, f);
  const total = filtered.length;

  let data;
  if (f.order === "random") {
    const rng =
      f.seed != null ? mulberry32(hashSeed(f.seed)) : Math.random;
    data = getRandomItems(filtered, f.limit, rng);
  } else if (f.order === "none") {
    data = filtered.slice(f.offset, f.offset + f.limit);
  } else {
    const sorted = sortQuotes(filtered, f.order);
    data = sorted.slice(f.offset, f.offset + f.limit);
  }

  const meta = {
    total,
    limit: f.limit,
    offset: f.offset,
    order: f.order,
    returned: data.length,
  };

  return { data, meta, f };
}

module.exports = { buildQuotesResponse };
