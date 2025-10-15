# ServiceSwap

ServiceSwap is a real-time platform for trading and sharing subscription services. Users can list services they own, browse available services, and make trade offers in real-time.

## Features

- **Real-time Updates**: Instant notifications for new services and trade offers
- **Service Marketplace**: Browse, search, and filter available services
- **Trade System**: Make offers, accept/decline trades, and complete transactions
- **User Dashboard**: Track your listings, purchases, and trade statistics
- **Secure Authentication**: JWT-based authentication for all operations

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ServiceSwap.git
cd ServiceSwap
```

2. Install dependencies for both frontend and backend
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ..
npm install
```

3. Set up environment variables
Create a `.env` file in the server directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/serviceswap
JWT_SECRET=your_jwt_secret
```

4. Start the development servers
```bash
# Start backend server
cd server
npm run dev

# In a new terminal, start frontend
cd ..
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/signup`: Register a new user
- `POST /api/auth/login`: Login and get JWT token
- `GET /api/auth/me`: Get current user info

### Services Endpoints

- `GET /api/services`: Get all services with optional filters
- `POST /api/services`: Create a new service listing
- `GET /api/services/:id`: Get a specific service by ID

### Trades Endpoints

- `GET /api/trades`: Get all trades for the authenticated user
- `POST /api/trades`: Create a new trade offer
- `PUT /api/trades/:id/accept`: Accept a trade offer
- `PUT /api/trades/:id/decline`: Decline a trade offer
- `PUT /api/trades/:id/cancel`: Cancel a trade offer
- `PUT /api/trades/:id/complete`: Mark a trade as completed

## Real-time Events

ServiceSwap uses Socket.IO for real-time communication. The following events are available:

### Client Events
- `connection`: Establish a socket connection with authentication
- `disconnect`: Close the socket connection

### Server Events
- `new_service`: Emitted when a new service is listed
- `new_trade_offer`: Emitted when a user receives a new trade offer
- `trade_accepted`: Emitted when a trade offer is accepted
- `trade_declined`: Emitted when a trade offer is declined
- `trade_cancelled`: Emitted when a trade offer is cancelled
- `trade_completed`: Emitted when a trade is completed