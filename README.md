# 🛠️ Backend API Documentation

## 👤 User Endpoints

### POST `/api/user/signup`  
**Description:** Registers a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": "1",
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

---

### POST `/api/user/login`  
**Description:** Authenticates a user.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": "1",
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

---

### POST `/api/user/logout`  
**Description:** Logs out the user.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/api/user/checkAuth`  
**Description:** Checks if the user is authenticated.

**Response:**
```json
{
  "id": "1",
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

---

## 🛡️ Admin Endpoints

### POST `/api/admin/signup`  
**Description:** Registers a new admin.

**Request Body:**
```json
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "id": "1",
  "name": "Admin",
  "email": "admin@example.com",
  "apikey": "123456789"
}
```

---

### POST `/api/admin/login`  
**Description:** Authenticates an admin.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "id": "1",
  "name": "Admin",
  "email": "admin@example.com",
  "apikey": "123456789"
}
```

---

### POST `/api/admin/logout`  
**Description:** Logs out the admin.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/api/admin/checkAuth`  
**Description:** Checks if the admin is authenticated.  
**Query Parameters:** `?apikey=YOUR_API_KEY`

**Response:**
```json
{
  "id": "1",
  "name": "Admin",
  "email": "admin@example.com",
  "apikey": "123456789"
}
```

---

## 🔧 Admin Actions Endpoints

### POST `/api/buses/addBus`  
**Description:** Adds a new bus.  
**Query Parameters:** `?apikey=YOUR_API_KEY`

**Request Body:**
```json
{
  "start_station": "Station A",
  "end_station": "Station B",
  "seats_available": 100
}
```

**Response:**
```json
{
  "id": "1",
  "start_station": "Station A",
  "end_station": "Station B",
  "seats_available": 100,
  "seats_filled": 0
}
```

---

### POST `/api/buses/modifyAvailability`  
**Description:** Modifies seat availability for a bus.  
**Query Parameters:** `?apikey=YOUR_API_KEY`

**Request Body:**
```json
{
  "id": "1",
  "seats_available": 150
}
```

**Response:**
```json
{
  "id": "1",
  "start_station": "Station A",
  "end_station": "Station B",
  "seats_available": 150,
  "seats_filled": 0
}
```

---

### POST `/api/admin/generateApiKey`  
**Description:** Generates a new API key for the admin.  
**Query Parameters:** `?apikey=YOUR_API_KEY`

**Response:**
```json
{
  "API_KEY": "987654321",
  "name": "Admin"
}
```

---

## 🧾 User Booking Endpoints

### POST `/api/bookings/checkBuses`  
**Description:** Checks available buses between two stations (authenticated users only).

**Request Body:**
```json
{
  "start_station": "Station A",
  "end_station": "Station B"
}
```

**Response:**
```json
[
  {
    "id": "1",
    "start_station": "Station A",
    "end_station": "Station B",
    "seats_available": 100,
    "seats_filled": 50
  }
]
```

---

### POST `/api/bookings/checkSeatsAvailability`  
**Description:** Checks seat availability for a specific bus (authenticated users only).

**Request Body:**
```json
{
  "id": "1"
}
```

**Response:**
```json
{
  "seats_available": 100,
  "seats_filled": 50
}
```

---

### POST `/api/bookings/bookTickets`  
**Description:** Books tickets for a bus (authenticated users only).

**Request Body:**
```json
{
  "busId": "1",
  "seats": 2
}
```

**Response:**
```json
{
  "id": "10",
  "user_name": "John Doe",
  "user_email": "john.doe@example.com",
  "start_station": "Station A",
  "end_station": "Station B",
  "booking_id": "123456789",
  "seats_booked": "2"
}
```

---

### POST `/api/bookings/getBookingDetails`  
**Description:** Retrieves booking details using a booking ID (authenticated users only).

**Request Body:**
```json
{
  "booking_id": "123456789"
}
```

**Response:**
```json
{
  "id": "10",
  "user_name": "John Doe",
  "user_email": "john.doe@example.com",
  "start_station": "Station A",
  "end_station": "Station B",
  "booking_id": "123456789",
  "seats_booked": "2"
}
```

---

### GET `/api/bookings/myBookings`  
**Description:** Retrieves all bookings made by the authenticated user.

**Response:**
```json
{
  "total": 2,
  "bookings": [
    {
      "id": "10",
      "booking_id": "123456789",
      "start_station": "Station A",
      "end_station": "Station B",
      "seats_booked": "2"
    },
    {
      "id": "11",
      "booking_id": "987654321",
      "start_station": "Station A",
      "end_station": "Station C",
      "seats_booked": "3"
    }
  ]
}
```
