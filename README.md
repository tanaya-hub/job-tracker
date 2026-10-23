# Job Application Tracker

A full-stack web app to track job applications, companies, and interview rounds. Built with **Node.js, Express.js, REST APIs, HTML/CSS/JavaScript, MySQL, and MongoDB**.

It uses two databases on purpose: **MySQL** for structured, related data (users, companies, applications) and **MongoDB** for flexible, free-form data (interview notes).

## Features

- Register and log in with **JWT authentication** and **bcrypt** password hashing
- Add, edit, and delete **companies** and **job applications**
- Application statuses: wishlist, applied, interview, offer, rejected
- **Search, filter by status, and pagination** on the applications list
- **Status summary cards** (total and count per status) on the dashboard
- **Interview notes** for every application: round, date, mode, questions asked, notes, and outcome
- Every user sees only their own data (ownership checks on every query)
- Plain HTML/CSS/JS front end served by Express, with a pastel theme

## Tech stack

| Layer | Technology |
|---|---|
| Runtime and server | Node.js, Express.js 5 |
| Relational database | MySQL (`mysql2` connection pool) |
| Document database | MongoDB Atlas (`mongoose`) |
| Authentication | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| Front end | HTML, CSS, vanilla JavaScript (`fetch`) |
| Tooling | nodemon, dotenv, cors, Postman |

## Why two databases?

- **MySQL** stores users, companies, and applications. These have fixed columns and clear relationships (foreign keys, joins, `ON DELETE CASCADE`).
- **MongoDB** stores interview notes. Each round can have different details (a list of questions, free text, a different number of fields), which fits documents better than fixed columns.
- Each note stores the MySQL application `id` as `applicationId`, which links the two databases.
- MySQL cascades do not reach MongoDB, so deleting an application or a company also deletes its notes in the application code.

## Project structure

```
job-tracker/
├── public/                  Front end served by Express
│   ├── index.html           Login page
│   ├── register.html        Registration page
│   ├── dashboard.html       Dashboard with notes pop-up
│   ├── css/
│   │   ├── style.css        Login and register styles
│   │   └── dashboard.css    Dashboard styles
│   └── js/
│       ├── api.js           fetch helper and session handling
│       ├── dashboard.js     Dashboard logic
│       └── notes.js         Interview notes pop-up logic
├── src/
│   ├── config/
│   │   ├── mysql.js         MySQL connection pool
│   │   └── mongo.js         MongoDB connection
│   ├── controllers/         Request handling logic
│   ├── middleware/
│   │   └── authMiddleware.js   JWT check
│   ├── models/
│   │   └── InterviewNote.js    Mongoose schema
│   ├── routes/              Express routers
│   └── server.js            App entry point
├── .env.example             Environment variable template
├── .gitignore
└── package.json
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS version)
- [MySQL](https://dev.mysql.com/downloads/) running locally
- A MongoDB database: either a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local MongoDB install

### 1. Clone and install

```bash
git clone https://github.com/<tanaya-hub>/job-tracker.git
cd job-tracker
npm install
```

### 2. Create the MySQL database and tables

Open MySQL Workbench (or the `mysql` command line) and run:

```sql
CREATE DATABASE job_tracker;
USE job_tracker;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(100),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_id INT NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  status ENUM('wishlist','applied','interview','offer','rejected') DEFAULT 'wishlist',
  applied_date DATE,
  job_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

### 3. Set up environment variables

Copy the template and fill in your own values:

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

| Variable | Description |
|---|---|
| `PORT` | Port for the server (default 5000) |
| `MYSQL_HOST` | MySQL host, usually `localhost` |
| `MYSQL_USER` | MySQL user, for example `root` |
| `MYSQL_PASSWORD` | Your MySQL password |
| `MYSQL_DB` | Database name, `job_tracker` |
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | A long random secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1d` |

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If you use MongoDB Atlas, add your IP address under **Network Access**, and put the database name in the connection string (for example `...mongodb.net/job_tracker?appName=...`).

### 4. Run the app

```bash
npm run dev      # development, restarts on file changes (nodemon)
npm start        # production
```

Open **http://localhost:5000**, register an account, and log in.

## API reference

All routes except register and login need the header `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Log in, returns a JWT and the user |
| GET | `/api/auth/me` | Get the logged-in user |

### Companies

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/companies` | List your companies (optional `?search=`) |
| POST | `/api/companies` | Create a company (`name`, `location`, `website`) |
| GET | `/api/companies/:id` | Get one company |
| PUT | `/api/companies/:id` | Update a company |
| DELETE | `/api/companies/:id` | Delete a company, its applications, and their notes |

### Applications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applications` | List applications with filters and pagination |
| GET | `/api/applications/stats` | Total and count per status |
| POST | `/api/applications` | Create an application |
| GET | `/api/applications/:id` | Get one application |
| PUT | `/api/applications/:id` | Update an application |
| PATCH | `/api/applications/:id/status` | Change only the status |
| DELETE | `/api/applications/:id` | Delete an application and its notes |

Query parameters for `GET /api/applications`:

| Parameter | Description |
|---|---|
| `status` | `wishlist`, `applied`, `interview`, `offer`, or `rejected` |
| `search` | Matches the job title or the company name |
| `company_id` | Only applications for one company |
| `page` | Page number (default 1) |
| `limit` | Items per page (default 10, maximum 50) |

Example response:

```json
{
  "data": [ { "id": 1, "job_title": "Java Full Stack Developer", "company_name": "Infosys", "status": "applied" } ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "totalPages": 1
}
```

### Interview notes (MongoDB)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applications/:applicationId/notes` | List notes for an application |
| POST | `/api/applications/:applicationId/notes` | Add a note |
| PUT | `/api/applications/:applicationId/notes/:noteId` | Update a note |
| DELETE | `/api/applications/:applicationId/notes/:noteId` | Delete a note |

Example note body:

```json
{
  "round": "Technical Round 1",
  "interviewDate": "2026-10-28",
  "mode": "online",
  "questions": ["Explain how Spring Boot auto-configuration works"],
  "notes": "Revise joins and indexing.",
  "outcome": "pending"
}
```

`mode` is one of `online`, `offline`, `phone`. `outcome` is one of `pending`, `passed`, `failed`.

### Status codes used

`200` OK, `201` Created, `400` Validation error, `401` Not authorized, `404` Not found, `409` Email already registered, `500` Server error.

## Security and design decisions

- Passwords are hashed with **bcrypt** and never stored as plain text.
- Login returns the same error for a wrong email and a wrong password, so it does not reveal which emails exist.
- **Parameterized SQL queries** (`?` placeholders) protect against SQL injection.
- Every query includes the logged-in user's id, so users cannot read or change each other's data.
- The server checks that a `company_id` or an application belongs to the user before using it.
- User-supplied text is HTML-escaped before being shown on the page (**XSS protection**), and only `http(s)` links are made clickable.
- Only an allowed list of fields is accepted for notes, so extra fields in a request body are ignored.
- Secrets live in `.env`, which is excluded from Git.
- Known limitation: the token is kept in `localStorage`. Production apps often use httpOnly cookies instead.

## What I learned

- Building a REST API with Express: routers, controllers, middleware, and a central error handler
- JWT authentication and protecting routes
- Designing relational tables with foreign keys, joins, and cascades
- Modelling flexible data with MongoDB and Mongoose
- Keeping two databases consistent from application code
- Connecting a plain JavaScript front end to an API with `fetch`

## Screenshots

_Add screenshots of the login page, the dashboard, and the notes pop-up here._

## Author

**Tanaya Burande**
