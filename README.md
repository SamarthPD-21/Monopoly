# SPD-Monopoly

Full-stack multiplayer Monopoly game with real-time gameplay powered by WebSockets, JWT authentication, and MongoDB persistence.

## Tech Stack
- **Frontend**: Next.js 16, React 18, TypeScript, Tailwind CSS
- **Backend**: Spring Boot 3.1, Java 21, WebSocket, Spring Security
- **Database**: MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing

## Features
- Real-time multiplayer gameplay with WebSocket communication
- User authentication and authorization with JWT
- Lobby creation and management
- Turn-based game mechanics with dice rolling
- Property transactions and ownership tracking
- Bot scheduler for automated players
- Persistent game state with MongoDB
- Complete Monopoly board with 40 properties

---

## Server

Spring Boot server with a WebSocket handler for real-time multiplayer communication.

Run with:

```powershell
cd server
mvn spring-boot:run
```

Server listens on port 8080 and exposes a WebSocket at ws://localhost:8080/game

Authentication
--

This project now uses Spring Security. There are two in-memory test users created by default:

- username: player1  password: pass
- username: player2  password: pass

You can obtain a JWT token programmatically by POSTing to /auth/token with JSON { "username": "player1", "password": "pass" }.

Example:

```powershell
curl -X POST http://localhost:8080/auth/token -H "Content-Type: application/json" -d '{"username":"player1","password":"pass"}'
```

The client (Next.js app) now supports logging in and will attach the JWT as a query param to the WebSocket URL so the server can authenticate the socket.

Notes about Maven
--
If you don't have Maven installed on your machine, you can install it on Windows with Chocolatey:

```powershell
choco install maven -y
```

Or download from https://maven.apache.org/download.cgi and follow the platform instructions. Another option is to generate and commit the Maven Wrapper locally (not included here) so other developers can run `mvnw` without installing Maven.
