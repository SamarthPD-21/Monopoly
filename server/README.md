# Monopoly server

Spring Boot server with a WebSocket handler.

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
