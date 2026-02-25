# Barber Reservation — Frontend

A simple reservation flow for a barbershop. Built as a practical exercise — no frameworks, just vanilla HTML, CSS and JavaScript.

## What it does

Three-step booking process:

1. Pick a service and a barber
2. Choose a date and time slot from the calendar
3. Fill in your contact details and confirm

The whole thing runs in the browser with hardcoded test data, no backend required.

## Running it

Serve the directory with any static file server, for example:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Notes

- Mobile-first layout, tested down to 320px wide
- No dependencies, no build step
- Keyboard navigation works throughout, ARIA attributes are in place for screen readers
- State is managed in a plain JS object — selections from step 1 are still there when you reach step 3

## Structure

```
index.html   — markup and page structure
style.css    — all styles, variables at the top
app.js       — state, rendering, event handling
```

## API design

If this were connected to a real backend, the frontend would need these endpoints:

| Method | URL | Returns |
|--------|-----|---------|
| `GET` | `/api/services` | List of available services with price and duration |
| `GET` | `/api/barbers` | List of barbers, filterable by service |
| `GET` | `/api/barbers/{id}/availability?date=YYYY-MM-DD` | Available time slots for a barber on a given day |
| `POST` | `/api/reservations` | Create a reservation, returns confirmation |
| `GET` | `/api/reservations/{id}` | Get reservation details |
| `DELETE` | `/api/reservations/{id}` | Cancel a reservation |
