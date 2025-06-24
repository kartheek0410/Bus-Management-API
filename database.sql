-- users schema

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(400)
);

--admins schema
CREATE TABLE admins(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(400),
    api_key VARCHAR(400)
);

--buses schema
CREATE TABLE buses(
    id SERIAL PRIMARY KEY,
    start_station VARCHAR(400),
    end_station VARCHAR(400),
    seats_available INTEGER,
    seats_filled INTEGER
);

--bookings schema
CREATE TABLE bookings(
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(400),
    user_email VARCHAR(400),
    start_station VARCHAR(400),
    end_station VARCHAR(400),
    booking_id VARCHAR(400),
    seats_booked INTEGER
);