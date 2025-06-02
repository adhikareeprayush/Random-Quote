# 📜 Random Quotes API

A lightweight Node.js API that serves random and filtered quotes from a CSV file. Supports filtering by author or category, and returns a randomized selection of quotes.
Live at: [https://random-quote-5t13.onrender.com/](https://random-quote-5t13.onrender.com/)

---

## 🚀 Features

- Load quotes from a CSV file on startup
- Filter quotes by author and/or category
- Get random quotes (single or multiple)
- Specify limits on number of returned quotes
- Consistent output in JSON format

---

## 📁 Project Structure

```

.
├── quotes.csv      # CSV file with quotes
├── server.js       # Main Express server
├── package.json
└── README.md

````

---

## 🛠️ Installation

1. Clone the repo:

```bash
git clone https://github.com/adhikareeprayush/Random-Quote.git
cd Random-Quote
````

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

Server will start on `http://localhost:3000` after CSV is loaded.

---

## 📄 CSV Format

Your `quotes.csv` should follow this structure:

```csv
quote,author,category
"Quote text",Author Name,"category1, category2"
```

Example:

```csv
"I'm selfish, impatient and a little insecure...",Marilyn Monroe,"life, love, mistakes"
```

---

## 📡 API Endpoints

### 1. `GET /api/quotes`

Returns **random filtered quotes**.

#### 🔧 Query Parameters:

| Param      | Type   | Description                                           |
| ---------- | ------ | ----------------------------------------------------- |
| `author`   | string | Filter quotes by author                               |
| `category` | string | Filter quotes by category                             |
| `limit`    | number | Max number of quotes to return (default: 10, max: 50) |

#### Example:

```bash
GET /api/quotes?author=monroe&category=love&limit=3
```

---

### 2. `GET /api/quotes/random`

Returns completely **random quotes**.

#### 🔧 Query Parameters:

| Param   | Type   | Description                                   |
| ------- | ------ | --------------------------------------------- |
| `limit` | number | Number of random quotes (default: 1, max: 50) |

#### Example:

```bash
GET /api/quotes/random?limit=5
```

---

## 📌 Notes

* All responses are in JSON.
* Filtering is case-insensitive.
* Categories are stored and matched in lowercase.
* Maximum `limit` is capped at 50 to avoid memory overuse.

---

## 🧪 Testing

Use tools like [Postman](https://www.postman.com/) or cURL:

```bash
curl http://localhost:3000/api/quotes/random?limit=5
curl "http://localhost:3000/api/quotes?author=Seuss&limit=2"
```

---

## 📦 Dependencies

* [Express](https://expressjs.com/)
* [csv-parser](https://www.npmjs.com/package/csv-parser)

Install them via:

```bash
npm install express csv-parser
```

## 💡 Future Improvements

* Add support for POSTing new quotes
* Pagination for large result sets
* Web interface to browse/search quotes

