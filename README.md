# ZenoRide

A real-time ride-sharing web application. Riders can request rides by setting a pickup and drop-off location. Drivers go online, receive nearby ride requests, and accept them. The entire flow is live — both sides update in real time via WebSockets.

---

## Architecture

```
Browser (Rider)                    Browser (Driver)
      |                                  |
      |  HTTP REST (fetch/api.js)        |  HTTP REST (fetch/api.js)
      |  WebSocket (Socket.io client)    |  WebSocket (Socket.io client)
      |                                  |
      +------------+  +------------------+
                   |  |
            +-----------+
            |  Express   |  (Node.js HTTP server)
            |  server.js |
            +-----------+
               |      |
         REST API    Socket.io
         Routes       Server
           |              |
     Controllers      Socket Handlers
       (HTTP logic)   (real-time events)
           |              |
        Services  <-------+
     (business logic)
           |
     Repositories
     (DB queries)
           |
    +------+------+
    |             |
PostgreSQL       Redis
(rides, users)  (driver geo positions)
```

---

## Technologies

**Backend**

- Node.js + Express — HTTP server and REST API
- Socket.io — real-time bidirectional communication
- PostgreSQL — persistent storage for users and rides
- Redis — geo-spatial driver location tracking (GEOADD / GEOSEARCH)
- bcrypt — password hashing
- jsonwebtoken — JWT-based authentication
- dotenv — environment variable management

**Frontend**

- Vanilla HTML, CSS, JavaScript — no frameworks
- Leaflet.js — interactive map rendering
- Socket.io client — real-time event handling
- Nominatim (OpenStreetMap) — free geocoding and reverse geocoding

---

## Project Structure

```
ZenoRide/
  README.md
  Frontend/
    HTML/
      Home.html          Landing page with features overview
      login.html         Login form
      signup.html        Registration form (name, email, phone, password, role)
      profile.html       Logged-in user profile page
      book-ride.html     Main ride booking page (map + sidebar, works for both roles)
    CSS/
      main.css           Single shared stylesheet for all pages
    Js/
      auth.js            Token/role/name helpers (getToken, getRole, requireAuth, logout)
      api.js             Wrapper for authenticated fetch (api.get, api.post)
      socket-manager.js  Singleton Socket.io client (connect, disconnect, get)
      book-ride.js       All ride booking logic — rider view and driver view
      home.js            Home page interactions
      login.js           Login form submission and redirect
      signup.js          Signup form submission and redirect
      profile.js         Profile page data fetch and display
      loader.js          Full-screen loading overlay (show, hide)
      toast.js           Toast notification system (info, success, error)
    images/
      hero-ride.svg              Hero section illustration
      auth-illustration.svg      Login/signup page illustration
      features-fast.svg          Feature card illustration
      features-safe.svg          Feature card illustration
      features-affordable.svg    Feature card illustration
      features-tracking.svg      Feature card illustration

  Node_Backend/
    server.js              Entry point — creates Express app, HTTP server, Socket.io instance
    .env                   Environment variables (DB connection, Redis URL, JWT secret)
    package.json           Project dependencies
    src/
      config/
        db.js              PostgreSQL connection pool (pg)
        redis.js           Redis client connection
      controllers/
        user.controller.js    Handles signup, login, profile HTTP requests
        rides.controller.js   Handles request ride, accept ride, cancel ride
        driver.controller.js  Handles driver location update, nearby drivers query
      routes/
        user.routes.js        POST /auth/signup, POST /auth/login, GET /auth/profile
        rides.routes.js       POST /rides/request, POST /rides/:id/accept, POST /rides/:id/cancel
        driver.routes.js      POST /driver/location, GET /driver/nearby
      middleware/
        auth.middleware.js    Verifies JWT token on protected routes
        role.middleware.js    Restricts routes by user role (rider / driver)
        errorHandler.js       Global error handler — formats AppError responses
      services/
        user.service.js       Signup (hash password, insert user), login (verify, issue JWT)
        ride.service.js       requestRide, notifyDrivers, acceptRide, cancelRide
        driver.service.js     upateDriverLocation (Redis GEOADD), findNearbyDrivers, findNearbyDriversWithCoords
      repositories/
        user.repository.js    DB queries — createUser, findUserByEmail
        rides.repository.js   DB queries — createRide, findRideById, updateRideDriver, cancelRide
      sockets/
        index.js              Registers Socket.io on the server, JWT auth middleware, connects handlers
        io.js                 Stores and exposes the global Socket.io instance (setIO / getIO)
        driver.socket.js      Tracks online drivers in a Map, handles driver:location event, broadcasts to riders room
        ride.socket.js        Handles ride:accept socket event (legacy — HTTP accept is preferred)
      utils/
        AppError.js           Custom error class with status code
        hash.util.js          bcrypt hash and compare helpers
        jwt.util.js           JWT sign and verify helpers
```

---

## Database Schema

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('rider', 'driver'))
);

CREATE TABLE rides (
  id          SERIAL PRIMARY KEY,
  rider_id    INTEGER REFERENCES users(id),
  driver_id   INTEGER REFERENCES users(id),
  pickup_lat  NUMERIC,
  pickup_lng  NUMERIC,
  drop_lat    NUMERIC,
  drop_lng    NUMERIC,
  status      TEXT DEFAULT 'requested'
);
```

---

## API Reference

| Method | Endpoint                | Auth | Role   | Description                         |
| ------ | ----------------------- | ---- | ------ | ----------------------------------- |
| POST   | /auth/signup            | No   | Any    | Register a new user                 |
| POST   | /auth/login             | No   | Any    | Login and receive JWT               |
| GET    | /auth/profile           | Yes  | Any    | Get current user profile            |
| POST   | /rides/request          | Yes  | rider  | Create a new ride request           |
| POST   | /rides/rides/:id/accept | Yes  | driver | Accept a ride                       |
| POST   | /rides/rides/:id/cancel | Yes  | rider  | Cancel a pending ride               |
| POST   | /driver/location        | Yes  | driver | Update driver GPS position in Redis |
| GET    | /driver/nearby          | Yes  | Any    | Get nearby drivers with coordinates |

---

## Socket.io Events

| Event                 | Direction             | Payload                | Description                                     |
| --------------------- | --------------------- | ---------------------- | ----------------------------------------------- |
| driver:location       | client to server      | { lat, lng }           | Driver sends current GPS position               |
| driver:locationUpdate | server to riders room | { driverId, lat, lng } | Server broadcasts driver position to all riders |
| ride:requested        | server to driver      | ride object            | New ride request near the driver                |
| ride:accepted         | server to all         | ride object            | A ride has been accepted                        |
| ride:cancelled        | server to all         | { rideId }             | A ride was cancelled by the rider               |
| ride:error            | server to client      | { message }            | Error during ride operation                     |

---

## How to Run

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Redis running locally

### 1. Clone the repository

```
git clone https://github.com/your-username/zenoride.git
cd zenoride
```

### 2. Set up the database

Connect to PostgreSQL and run the schema from the Database Schema section above.

### 3. Configure environment variables

Create `Node_Backend/.env`:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/zenoride
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
```

### 4. Install dependencies and start the backend

```
cd Node_Backend
npm install
node server.js
```

Server starts on http://localhost:3000

### 5. Open the frontend

Open `Frontend/HTML/Home.html` directly in a browser. No build step required.

---

## How It Works

1. A user signs up and selects a role — rider or driver.
2. A rider opens the booking page, sets a pickup location (via text search or live GPS) and a destination, then clicks Request Ride.
3. The server saves the ride and emits `ride:requested` directly to nearby online drivers using Redis geo-search.
4. A driver who has clicked Go Online receives the request in real time. Their card shows pickup and drop-off coordinates on the map.
5. The driver clicks Accept Ride. The server updates the ride status in PostgreSQL and broadcasts `ride:accepted` to all connected clients.
6. The rider sees "Driver En Route" and the loading overlay is replaced with a confirmation banner.
7. If the rider cancels before a driver accepts, the server marks the ride as cancelled and broadcasts `ride:cancelled` so driver cards disappear.
   #   Z e n o R i d e 
    
    

