# ZenoRide

A real-time ride-hailing web application. Riders request rides; nearby drivers receive instant notifications and can accept or cancel. Live driver locations are tracked on an interactive map.

---

## Technologies Used

| Layer           | Technology                    |
| --------------- | ----------------------------- |
| Backend Runtime | Node.js + Express.js          |
| Real-time       | Socket.IO                     |
| Database        | PostgreSQL                    |
| Location Cache  | Redis (GEO commands)          |
| Authentication  | JWT + bcrypt                  |
| Frontend        | Vanilla HTML, CSS, JavaScript |
| Maps            | Leaflet.js                    |

---

## Architecture

```
Browser (Rider / Driver)
        |
        |  HTTP REST          WebSocket (Socket.IO)
        |
+-------+--------------------------------------------------+
|                     Express Server (server.js)           |
|                                                          |
|   /auth  routes          /rides routes   /driver routes  |
|      |                        |                |         |
|  user.controller        rides.controller  driver.controller
|      |                        |                |         |
|  user.service           ride.service      driver.service |
|      |                        |                |         |
|  user.repository        rides.repository       |         |
|      |                        |                |         |
+------+------------------------+----------------+---------+
       |                        |                |
  PostgreSQL               PostgreSQL           Redis
  (users table)           (rides table)    (driver GEO index)
```

**Request-a-ride flow:**

1. Rider submits pickup/drop coordinates via REST
2. Server saves ride in PostgreSQL with status `requested`
3. Server queries Redis for nearby drivers (geo radius search)
4. Online drivers are notified via Socket.IO event `ride:requested`
5. Driver accepts → PostgreSQL updated to `accepted`, rider notified via `ride:accepted`

---

## Project Structure

```
ZenoRide/
├── Frontend/
│   ├── HTML/
│   │   ├── Home.html          Landing page
│   │   ├── login.html         Login form
│   │   ├── signup.html        Registration form
│   │   ├── book-ride.html     Ride booking + live map
│   │   └── profile.html       User profile view
│   ├── CSS/
│   │   └── main.css           Global styles
│   └── Js/
│       ├── auth.js            JWT storage/decode helpers (localStorage)
│       ├── api.js             Fetch wrapper for REST calls
│       ├── socket-manager.js  Socket.IO client connection manager
│       ├── login.js           Login page logic
│       ├── signup.js          Signup page logic
│       ├── home.js            Home page logic
│       ├── book-ride.js       Map, ride request, driver tracking
│       ├── profile.js         Profile page logic
│       ├── loader.js          Loading spinner utility
│       └── toast.js           Toast notification utility
│
└── Node_Backend/
    ├── server.js              Entry point — Express + Socket.IO setup
    ├── package.json
    └── src/
        ├── config/
        │   ├── db.js          PostgreSQL pool connection
        │   └── redis.js       Redis client connection
        ├── routes/
        │   ├── user.routes.js     POST /auth/signup, POST /auth/login
        │   ├── rides.routes.js    POST /rides/request, PATCH /rides/:id/accept
        │   └── driver.routes.js   PUT /driver/location, GET /driver/nearby
        ├── controllers/
        │   ├── user.controller.js    Handle signup, login, /me
        │   ├── rides.controller.js   Handle requestRide, acceptRide, cancelRide
        │   └── driver.controller.js  Handle updateLocation, getNearbyDrivers
        ├── services/
        │   ├── user.service.js    Hash password, generate JWT
        │   ├── ride.service.js    Business logic + notify drivers via socket
        │   └── driver.service.js  Store/query driver location in Redis GEO
        ├── repositories/
        │   ├── user.repository.js   SQL queries for users table
        │   └── rides.repository.js  SQL queries for rides table
        ├── middleware/
        │   ├── auth.middleware.js   Verify JWT on protected routes
        │   ├── role.middleware.js   Restrict routes by user role (rider/driver)
        │   └── errorHandler.js      Central error response handler
        ├── sockets/
        │   ├── index.js         Register all socket handlers, authenticate socket
        │   ├── io.js            Singleton getter/setter for the io instance
        │   ├── driver.socket.js Track connected driver sockets in a Map
        │   └── ride.socket.js   Ride-related socket events
        └── utils/
            ├── jwt.util.js      generateToken / verifyToken wrappers
            ├── hash.util.js     bcrypt hash/compare helpers
            └── AppError.js      Custom error class with HTTP status code
```

---

## How to Run

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (`zenoride` database)
- Redis running locally on port `6379`

### 1. Database setup

Create the required tables in PostgreSQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password TEXT,
  role TEXT DEFAULT 'rider'
);

CREATE TABLE rides (
  id SERIAL PRIMARY KEY,
  rider_id INT REFERENCES users(id),
  driver_id INT REFERENCES users(id),
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  drop_lat FLOAT,
  drop_lng FLOAT,
  status TEXT DEFAULT 'requested'
);
```

### 2. Environment variables

Create `Node_Backend/.env`:

```
JWT_SECRET=your_secret_key
```

### 3. Install and start backend

```bash
cd Node_Backend
npm install
npm start
```

Server runs at `http://localhost:3000`

### 4. Open frontend

Open any HTML file directly in a browser, for example `Frontend/HTML/Home.html`.

---

## API Endpoints

| Method | Route                 | Auth         | Description                   |
| ------ | --------------------- | ------------ | ----------------------------- |
| POST   | /auth/signup          | No           | Register a new user           |
| POST   | /auth/login           | No           | Login and receive JWT         |
| GET    | /auth/me              | JWT          | Get current user info         |
| POST   | /rides/request        | JWT (rider)  | Request a new ride            |
| PATCH  | /rides/:rideId/accept | JWT (driver) | Accept a ride                 |
| PATCH  | /rides/:rideId/cancel | JWT          | Cancel a ride                 |
| PUT    | /driver/location      | JWT (driver) | Update driver GPS location    |
| GET    | /driver/nearby        | JWT          | Get drivers near a coordinate |

## Socket Events

| Event            | Direction       | Description               |
| ---------------- | --------------- | ------------------------- |
| `ride:requested` | Server → Driver | New ride available nearby |
| `ride:accepted`  | Server → Rider  | Driver accepted the ride  |
| `ride:cancelled` | Server → All    | Ride was cancelled        |
