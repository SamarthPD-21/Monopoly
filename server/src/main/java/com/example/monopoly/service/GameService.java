package com.example.monopoly.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.example.monopoly.model.Lobby;
import com.example.monopoly.repository.LobbyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GameService {
    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Path persistPath = Paths.get("game-state.json");
    private final LobbyRepository lobbyRepository;

    public GameService(LobbyRepository lobbyRepository) {
        this.lobbyRepository = lobbyRepository;
    }

    private static class Player {
        public final String id;
        public final String name;
        public int pos = 0;
        public int money = 1500;

        public Player(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    private static class Property {
        public final int id;
        public final String name;
        public final int cost;
        public String ownerId = null;

        public Property(int id, String name, int cost) {
            this.id = id;
            this.name = name;
            this.cost = cost;
        }
    }

    private static class Room {
        public final String id;
        public final Map<String, Player> players = new LinkedHashMap<>();
        public final Map<String, Boolean> readyStates = new ConcurrentHashMap<>();
        public final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
        public final List<Property> properties = new ArrayList<>();
        public Map<String, Object> lastMove = new HashMap<>();
        public boolean started = false;
        public String adminId = null;
        public String adminPrincipal = null;
        public int startAmount = 1500;
        public String currentTurn = null; // Player ID whose turn it is
        public int turnIndex = 0; // Index in player list

        public Room(String id) { this.id = id; }
    }

    // create or return room and ensure default properties
    private Room ensureRoom(String roomId) {
        return rooms.computeIfAbsent(roomId, (k) -> {
            Room r = new Room(k);
            
            // Create REAL Monopoly board with 40 spaces (classic board layout)
            // Bottom row (RIGHT TO LEFT): positions 0-10
            r.properties.add(new Property(0, "GO", 0));
            r.properties.add(new Property(1, "Mediterranean Avenue", 60));
            r.properties.add(new Property(2, "Community Chest", 0));
            r.properties.add(new Property(3, "Baltic Avenue", 60));
            r.properties.add(new Property(4, "Income Tax", 200));
            r.properties.add(new Property(5, "Reading Railroad", 200));
            r.properties.add(new Property(6, "Oriental Avenue", 100));
            r.properties.add(new Property(7, "Chance", 0));
            r.properties.add(new Property(8, "Vermont Avenue", 100));
            r.properties.add(new Property(9, "Connecticut Avenue", 120));
            r.properties.add(new Property(10, "Just Visiting", 0));
            
            // Left column (BOTTOM TO TOP): positions 11-19
            r.properties.add(new Property(11, "St. Charles Place", 140));
            r.properties.add(new Property(12, "Electric Company", 150));
            r.properties.add(new Property(13, "States Avenue", 140));
            r.properties.add(new Property(14, "Virginia Avenue", 160));
            r.properties.add(new Property(15, "Pennsylvania Railroad", 200));
            r.properties.add(new Property(16, "St. James Place", 180));
            r.properties.add(new Property(17, "Community Chest", 0));
            r.properties.add(new Property(18, "Tennessee Avenue", 180));
            r.properties.add(new Property(19, "New York Avenue", 200));
            
            // Top row (LEFT TO RIGHT): positions 20-30
            r.properties.add(new Property(20, "Free Parking", 0));
            r.properties.add(new Property(21, "Kentucky Avenue", 220));
            r.properties.add(new Property(22, "Chance", 0));
            r.properties.add(new Property(23, "Indiana Avenue", 220));
            r.properties.add(new Property(24, "Illinois Avenue", 240));
            r.properties.add(new Property(25, "B&O Railroad", 200));
            r.properties.add(new Property(26, "Atlantic Avenue", 260));
            r.properties.add(new Property(27, "Ventnor Avenue", 260));
            r.properties.add(new Property(28, "Water Works", 150));
            r.properties.add(new Property(29, "Marvin Gardens", 280));
            r.properties.add(new Property(30, "Go To Jail", 0));
            
            // Right column (TOP TO BOTTOM): positions 31-39
            r.properties.add(new Property(31, "Pacific Avenue", 300));
            r.properties.add(new Property(32, "North Carolina Avenue", 300));
            r.properties.add(new Property(33, "Community Chest", 0));
            r.properties.add(new Property(34, "Pennsylvania Avenue", 320));
            r.properties.add(new Property(35, "Short Line Railroad", 200));
            r.properties.add(new Property(36, "Chance", 0));
            r.properties.add(new Property(37, "Park Place", 350));
            r.properties.add(new Property(38, "Luxury Tax", 100));
            r.properties.add(new Property(39, "Boardwalk", 400));
            
            // Load settings from MongoDB lobby if it exists (but DON'T pre-populate players)
            try {
                Optional<Lobby> lobbyOpt = lobbyRepository.findByCode(k);
                if (lobbyOpt.isPresent()) {
                    Lobby lobby = lobbyOpt.get();
                    // Set admin principal to verify later when user connects
                    if (lobby.getAdminUsername() != null) {
                        r.adminPrincipal = lobby.getAdminUsername();
                    }
                    // Set start amount from lobby
                    if (lobby.getStartAmount() != null) {
                        r.startAmount = lobby.getStartAmount();
                    }
                    // NOTE: We DON'T pre-populate players here anymore!
                    // Players will be added dynamically when they connect via WebSocket.
                    // This prevents duplicate player entries when users reconnect or change auth state.
                }
            } catch (Exception e) {
                System.err.println("Failed to load lobby from MongoDB: " + e.getMessage());
            }
            
            return r;
        });
    }

    // add player to a specific room
    public String addPlayer(WebSocketSession session, String name, String preferredId, String roomId) {
        Room room = ensureRoom(roomId);
        boolean exists = preferredId != null && room.players.containsKey(preferredId);
        if (!exists && room.players.size() >= 4) return null;
        String id = preferredId != null ? preferredId : UUID.randomUUID().toString();
        Player p = room.players.get(id);
        if (p == null) {
            // New player joining
            p = new Player(id, name);
            // apply room startAmount as starting money
            p.money = room.startAmount;
            room.players.put(id, p);
            // set admin to the first creator if not set
            if (room.adminId == null) room.adminId = id;
            // if the room had a reserved admin principal, and this session matches it, assign admin to this player id
            try {
                Object principalObj = session.getPrincipal();
                if (room.adminPrincipal != null && principalObj instanceof java.security.Principal) {
                    java.security.Principal princ = (java.security.Principal) principalObj;
                    if (princ.getName() != null && princ.getName().equals(room.adminPrincipal)) {
                        room.adminId = id;
                        room.adminPrincipal = null;
                    }
                }
            } catch (Exception ignored) {}
            // Initialize ready state for new player
            room.readyStates.put(id, false);
        } else {
            // Existing player reconnecting - don't reset their ready state
            System.out.println("Player " + id + " reconnecting, preserving ready state: " + room.readyStates.getOrDefault(id, false));
        }
        room.sessions.put(session.getId(), session);
        session.getAttributes().put("playerId", id);
        session.getAttributes().put("roomId", roomId);
        saveState();
        return id;
    }

    // add bot to a specific room (admin only)
    public String addBot(WebSocketSession session, String botName, String roomId) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        
        System.out.println("addBot called: roomId from session=" + rid + ", playerId=" + pid);
        
        if (rid == null || pid == null) {
            System.out.println("addBot failed: roomId or playerId is null");
            return null;
        }
        
        Room room = rooms.get((String) rid);
        if (room == null) {
            System.out.println("addBot failed: room not found");
            return null;
        }
        
        System.out.println("Room found. adminId=" + room.adminId + ", adminPrincipal=" + room.adminPrincipal + ", players=" + room.players.size());
        
        // Check if requester is admin - check both playerId and principal name
        String requesterId = (String) pid;
        boolean isAdmin = requesterId.equals(room.adminId);
        
        // Also check if the session's principal matches adminPrincipal or adminId
        if (!isAdmin) {
            try {
                Object principalObj = session.getPrincipal();
                if (principalObj instanceof java.security.Principal) {
                    String principalName = ((java.security.Principal) principalObj).getName();
                    System.out.println("Checking principal: " + principalName + " against adminId=" + room.adminId + ", adminPrincipal=" + room.adminPrincipal);
                    if (principalName != null && (principalName.equals(room.adminId) || principalName.equals(room.adminPrincipal))) {
                        isAdmin = true;
                        // Update adminId to match the current player's ID for future checks
                        room.adminId = requesterId;
                        room.adminPrincipal = null;
                        System.out.println("Admin verified via principal, updated adminId to: " + requesterId);
                    }
                }
            } catch (Exception e) {
                System.out.println("Error checking principal: " + e.getMessage());
            }
        }
        
        if (!isAdmin) {
            System.out.println("addBot failed: requester " + requesterId + " is not admin " + room.adminId);
            return null;
        }
        
        // Check if room is full
        if (room.players.size() >= 4) {
            System.out.println("addBot failed: room is full");
            return null;
        }
        
        // Create bot with unique ID
        String botId = "bot_" + UUID.randomUUID().toString().substring(0, 8);
        Player bot = new Player(botId, botName);
        bot.money = room.startAmount;
        room.players.put(botId, bot);
        room.readyStates.put(botId, true); // Bots are always ready
        
        System.out.println("Bot added successfully: " + botId + " (" + botName + "), now " + room.players.size() + " players");
        
        saveState();
        return botId;
    }

    public void removeSession(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null) return;
        Room room = rooms.get((String) rid);
        if (room == null) return;
        if (pid != null) room.players.remove((String) pid);
        if (pid != null) room.readyStates.remove((String) pid);
        room.sessions.remove(session.getId());
        // if admin left, assign new admin (first player) or null
        if (pid != null && ((String) pid).equals(room.adminId)) {
            String newAdmin = null;
            for (String k : room.players.keySet()) { newAdmin = k; break; }
            room.adminId = newAdmin;
        }
        saveState();
    }

    public void setReadyForSession(WebSocketSession session, boolean ready) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return;
        Room room = rooms.get((String) rid);
        if (room == null) return;
        String id = (String) pid;
        if (!room.players.containsKey(id)) return;
        room.readyStates.put(id, ready);
        // auto-start when 4 players present and all ready
        if (room.players.size() >= 4) {
            boolean allReady = true;
            for (String k : room.players.keySet()) {
                if (!room.readyStates.getOrDefault(k, false)) { allReady = false; break; }
            }
            if (allReady) {
                room.started = true;
                // Initialize turn to first player
                if (room.currentTurn == null && !room.players.isEmpty()) {
                    room.currentTurn = room.players.keySet().iterator().next();
                    room.turnIndex = 0;
                }
            }
        }
        if (!ready) room.started = false;
        saveState();
    }

    public int rollForSession(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return -1;
        Room room = rooms.get((String) rid);
        if (room == null) return -1;
        
        // Check if it's this player's turn
        String playerId = (String) pid;
        if (room.currentTurn != null && !room.currentTurn.equals(playerId)) {
            return -1; // Not your turn
        }
        
        Player p = room.players.get(playerId);
        if (p == null) return -1;
        int dice = 1 + new Random().nextInt(6);
        int boardSize = room.properties.isEmpty() ? 12 : room.properties.size();
        p.pos = (p.pos + dice) % boardSize;
        room.lastMove = Map.of("playerId", p.id, "dice", dice);
        
        // Advance to next player's turn
        advanceTurn(room);
        
        saveState();
        return dice;
    }

    public Map<String,Object> buyForSession(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return Map.of("success", false, "message", "not-joined");
        Room room = rooms.get((String) rid);
        if (room == null) return Map.of("success", false, "message", "no-room");
        Player p = room.players.get((String) pid);
        if (p == null) return Map.of("success", false, "message", "no-player");
        if (room.properties.isEmpty()) return Map.of("success", false, "message", "no-properties");
        int pos = p.pos % room.properties.size();
        Property prop = room.properties.get(pos);
        if (prop.ownerId != null) return Map.of("success", false, "message", "already-owned");
        if (p.money < prop.cost) return Map.of("success", false, "message", "insufficient-funds");
        p.money -= prop.cost;
        prop.ownerId = p.id;
        saveState();
        return Map.of("success", true, "message", "bought", "propertyId", prop.id);
    }

    public Map<String,Object> getStateForRoom(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        if (rid == null) return Map.of("players", List.of(), "properties", List.of(), "lastMove", Map.of(), "started", false);
        Room room = rooms.get((String) rid);
        if (room == null) return Map.of("players", List.of(), "properties", List.of(), "lastMove", Map.of(), "started", false);
        List<Map<String,Object>> playersWithMoney = new ArrayList<>();
        for (Player p : room.players.values()) {
            boolean ready = room.readyStates.getOrDefault(p.id, false);
            playersWithMoney.add(Map.of("id", p.id, "name", p.name, "pos", p.pos, "money", p.money, "ready", ready));
        }
        List<Map<String,Object>> props = new ArrayList<>();
        for (Property pr : room.properties) {
            Map<String,Object> propMap = new HashMap<>();
            propMap.put("id", pr.id);
            propMap.put("name", pr.name);
            propMap.put("cost", pr.cost);
            propMap.put("ownerId", pr.ownerId); // can be null
            props.add(propMap);
        }
        Map<String,Object> result = new HashMap<>();
        result.put("players", playersWithMoney);
        result.put("properties", props);
        result.put("lastMove", room.lastMove);
        result.put("started", room.started);
        result.put("adminId", room.adminId);
        result.put("startAmount", room.startAmount);
        result.put("currentTurn", room.currentTurn);
        return result;
    }

    public boolean kickPlayer(WebSocketSession session, String targetPlayerId) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return false;
        Room room = rooms.get((String) rid);
        if (room == null) return false;
        String requester = (String) pid;
        if (room.adminId == null || !room.adminId.equals(requester)) return false;
        if (!room.players.containsKey(targetPlayerId)) return false;
        // remove player
        room.players.remove(targetPlayerId);
        room.readyStates.remove(targetPlayerId);
        // close their session if present
        WebSocketSession targetSession = null;
        for (WebSocketSession s : room.sessions.values()) {
            Object opid = s.getAttributes().get("playerId");
            if (opid != null && opid.equals(targetPlayerId)) { targetSession = s; break; }
        }
        if (targetSession != null) {
            try { targetSession.close(); } catch (Exception ignored) {}
            room.sessions.remove(targetSession.getId());
        }
        // ensure admin still valid
        if (!room.players.containsKey(room.adminId)) {
            String newAdmin = null; for (String k : room.players.keySet()) { newAdmin = k; break; }
            room.adminId = newAdmin;
        }
        saveState();
        return true;
    }

    public boolean setStartAmount(WebSocketSession session, int amount) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return false;
        Room room = rooms.get((String) rid);
        if (room == null) return false;
        String requester = (String) pid;
        if (room.adminId == null || !room.adminId.equals(requester)) return false;
        room.startAmount = amount;
        // update all players' money to the new start amount
        for (Player p : room.players.values()) p.money = amount;
        saveState();
        return true;
    }

    public boolean startForSession(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        Object pid = session.getAttributes().get("playerId");
        if (rid == null || pid == null) return false;
        Room room = rooms.get((String) rid);
        if (room == null) return false;
        
        String requesterId = (String) pid;
        // Only admin can start the game
        if (room.adminId == null || !room.adminId.equals(requesterId)) {
            System.out.println("startForSession failed: requester " + requesterId + " is not admin " + room.adminId);
            return false;
        }
        
        // Need at least 2 players to start
        if (room.players.size() < 2) {
            System.out.println("startForSession failed: need at least 2 players, have " + room.players.size());
            return false;
        }
        
        room.started = true;
        // Initialize turn to first player when starting
        if (room.currentTurn == null && !room.players.isEmpty()) {
            room.currentTurn = room.players.keySet().iterator().next();
            room.turnIndex = 0;
        }
        System.out.println("Game started in room " + room.id + " by admin " + requesterId);
        saveState();
        return true;
    }

    // Advance to next player's turn
    private void advanceTurn(Room room) {
        if (room.players.isEmpty()) return;
        List<String> playerIds = new ArrayList<>(room.players.keySet());
        room.turnIndex = (room.turnIndex + 1) % playerIds.size();
        room.currentTurn = playerIds.get(room.turnIndex);
    }

    // Bot AI: Make a turn for a bot player
    public void botTakeTurn(String roomId, String botId) {
        Room room = rooms.get(roomId);
        if (room == null || !room.started) return;
        
        // Verify it's the bot's turn
        if (!botId.equals(room.currentTurn)) return;
        
        Player bot = room.players.get(botId);
        if (bot == null) return;
        
        // Roll dice
        int dice = 1 + new Random().nextInt(6);
        int boardSize = room.properties.isEmpty() ? 12 : room.properties.size();
        bot.pos = (bot.pos + dice) % boardSize;
        room.lastMove = Map.of("playerId", bot.id, "dice", dice, "bot", true);
        
        // Simple AI: Try to buy property if it's affordable and unowned
        if (!room.properties.isEmpty()) {
            int pos = bot.pos % room.properties.size();
            Property prop = room.properties.get(pos);
            
            // Buy if affordable and unowned
            if (prop.ownerId == null && bot.money >= prop.cost) {
                // Random decision: 70% chance to buy
                if (new Random().nextInt(100) < 70) {
                    bot.money -= prop.cost;
                    prop.ownerId = bot.id;
                }
            }
            // Pay rent if owned by someone else
            else if (prop.ownerId != null && !prop.ownerId.equals(bot.id)) {
                Player owner = room.players.get(prop.ownerId);
                if (owner != null) {
                    int rent = prop.cost / 10; // Simple rent calculation
                    if (bot.money >= rent) {
                        bot.money -= rent;
                        owner.money += rent;
                    }
                }
            }
        }
        
        // Advance to next turn
        advanceTurn(room);
        saveState();
        
        // Broadcast state to all players in room
        try {
            String stateJson = mapper.writeValueAsString(Map.of("type", "state", "payload", getStateForRoomId(roomId)));
            for (WebSocketSession s : room.sessions.values()) {
                if (s.isOpen()) {
                    s.sendMessage(new TextMessage(stateJson));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Get state for a room by ID (helper for bot AI)
    private Map<String, Object> getStateForRoomId(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) return Map.of("players", List.of(), "properties", List.of(), "lastMove", Map.of(), "started", false);
        
        List<Map<String,Object>> playersWithMoney = new ArrayList<>();
        for (Player p : room.players.values()) {
            boolean ready = room.readyStates.getOrDefault(p.id, false);
            playersWithMoney.add(Map.of("id", p.id, "name", p.name, "pos", p.pos, "money", p.money, "ready", ready));
        }
        List<Map<String,Object>> props = new ArrayList<>();
        for (Property pr : room.properties) {
            props.add(Map.of("id", pr.id, "name", pr.name, "cost", pr.cost, "ownerId", pr.ownerId));
        }
        return Map.of("players", playersWithMoney, "properties", props, "lastMove", room.lastMove, "started", room.started, "adminId", room.adminId, "startAmount", room.startAmount, "currentTurn", room.currentTurn);
    }

    // Process all rooms and trigger bot turns if needed
    public void processBotTurns() {
        for (Map.Entry<String, Room> entry : rooms.entrySet()) {
            Room room = entry.getValue();
            if (!room.started || room.currentTurn == null) continue;
            
            // Check if current turn belongs to a bot
            if (room.currentTurn.startsWith("bot_")) {
                botTakeTurn(entry.getKey(), room.currentTurn);
            }
        }
    }

    public void broadcastToRoom(WebSocketSession session, String text) {
        Object rid = session.getAttributes().get("roomId");
        if (rid == null) return;
        Room room = rooms.get((String) rid);
        if (room == null) return;
        for (WebSocketSession s : room.sessions.values()) {
            if (s.isOpen()) {
                try { s.sendMessage(new TextMessage(text)); } catch (IOException e) { e.printStackTrace(); }
            }
        }
    }
    
    public String getPlayerIdForSession(WebSocketSession session) {
        Object rid = session.getAttributes().get("roomId");
        if (rid == null) return null;
        Room room = rooms.get((String) rid);
        if (room == null) return null;
        
        // Find the player associated with this session
        for (Map.Entry<String, WebSocketSession> entry : room.sessions.entrySet()) {
            if (entry.getValue().getId().equals(session.getId())) {
                return entry.getKey();
            }
        }
        return null;
    }
    
    private void broadcastState(Room room) {
        try {
            Map<String, Object> state = getStateForRoomId(room.id);
            String text = mapper.writeValueAsString(Map.of("type", "state", "payload", state));
            for (WebSocketSession s : room.sessions.values()) {
                if (s.isOpen()) {
                    try { 
                        s.sendMessage(new TextMessage(text)); 
                    } catch (IOException e) { 
                        e.printStackTrace(); 
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private synchronized void saveState() {
        try {
            Map<String,Object> out = new HashMap<>();
            Map<String,Object> roomsOut = new HashMap<>();
            for (Map.Entry<String, Room> en : rooms.entrySet()) {
                Room r = en.getValue();
                Map<String,Object> ro = new HashMap<>();
                ro.put("players", getPlayerPersistListForRoom(r));
                ro.put("properties", getPropertyPersistListForRoom(r));
                ro.put("lastMove", r.lastMove);
                ro.put("started", r.started);
                ro.put("adminId", r.adminId);
                ro.put("adminPrincipal", r.adminPrincipal);
                ro.put("startAmount", r.startAmount);
                roomsOut.put(en.getKey(), ro);
            }
            out.put("rooms", roomsOut);
            mapper.writeValue(persistPath.toFile(), out);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private List<Map<String,Object>> getPlayerPersistListForRoom(Room r) {
        List<Map<String,Object>> list = new ArrayList<>();
        for (Player p : r.players.values()) list.add(Map.of("id", p.id, "name", p.name, "pos", p.pos, "money", p.money));
        return list;
    }

    private List<Map<String,Object>> getPropertyPersistListForRoom(Room r) {
        List<Map<String,Object>> out = new ArrayList<>();
        for (Property pr : r.properties) {
            Map<String,Object> propMap = new HashMap<>();
            propMap.put("id", pr.id);
            propMap.put("name", pr.name);
            propMap.put("cost", pr.cost);
            propMap.put("ownerId", pr.ownerId); // can be null
            out.add(propMap);
        }
        return out;
    }

    private synchronized void loadState() {
        try {
            if (!Files.exists(persistPath)) return;
            Map m = mapper.readValue(persistPath.toFile(), Map.class);
            Object roomsObj = m.get("rooms");
            if (roomsObj instanceof Map) {
                Map rm = (Map) roomsObj;
                for (Object key : rm.keySet()) {
                    String rid = (String) key;
                    Object rv = rm.get(rid);
                    if (!(rv instanceof Map)) continue;
                    Map rmap = (Map) rv;
                    Room r = new Room(rid);
                    Object pls = rmap.get("players");
                    if (pls instanceof List) {
                        for (Object o : (List) pls) {
                            Map pm = (Map) o;
                            String id = (String) pm.get("id");
                            String name = (String) pm.get("name");
                            Player p = new Player(id, name);
                            Object pos = pm.get("pos"); if (pos instanceof Number) p.pos = ((Number) pos).intValue();
                            Object money = pm.get("money"); if (money instanceof Number) p.money = ((Number) money).intValue();
                            r.players.put(id, p);
                        }
                    }
                    Object prs = rmap.get("properties");
                    if (prs instanceof List) {
                        for (Object o : (List) prs) {
                            Map pm = (Map) o;
                            int id = ((Number) pm.get("id")).intValue();
                            String name = (String) pm.get("name");
                            int cost = ((Number) pm.get("cost")).intValue();
                            Property prop = new Property(id, name, cost);
                            prop.ownerId = (String) pm.get("ownerId");
                            r.properties.add(prop);
                        }
                    }
                    Object lm = rmap.get("lastMove");
                    if (lm instanceof Map) r.lastMove = (Map) lm;
                    Object st = rmap.get("started");
                    if (st instanceof Boolean) r.started = (Boolean) st;
                    Object adm = rmap.get("adminId");
                    if (adm instanceof String) r.adminId = (String) adm;
                    Object admP = rmap.get("adminPrincipal");
                    if (admP instanceof String) r.adminPrincipal = (String) admP;
                    Object sa = rmap.get("startAmount");
                    if (sa instanceof Number) r.startAmount = ((Number) sa).intValue();
                    rooms.put(rid, r);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // init
    {
        loadState();
    }

    // create a reserved lobby code and mark the principal name as intended admin
    public String createLobby(String principalName) {
        // try up to 1000 times to find an unused 6-digit code
        for (int i = 0; i < 1000; i++) {
            String code = String.valueOf(100000 + new Random().nextInt(900000));
            if (rooms.containsKey(code)) continue;
            Room r = new Room(code);
            // create default properties
            for (int j = 0; j < 36; j++) r.properties.add(new Property(j, "Tile " + j, 100 + (j % 12) * 25));
            r.adminPrincipal = principalName;
            rooms.put(code, r);
            saveState();
            return code;
        }
        return null;
    }
    
    // Buy a property
    public synchronized boolean buyProperty(String roomId, String playerId, int propertyId) {
        Room room = rooms.get(roomId);
        if (room == null) return false;
        
        Player player = room.players.get(playerId);
        if (player == null) return false;
        
        // Find the property
        Property property = room.properties.stream()
            .filter(p -> p.id == propertyId)
            .findFirst()
            .orElse(null);
        
        if (property == null) return false;
        
        // Check if property is already owned
        if (property.ownerId != null) {
            System.out.println("Property " + property.name + " is already owned by " + property.ownerId);
            return false;
        }
        
        // Check if player has enough money
        if (player.money < property.cost) {
            System.out.println("Player " + player.name + " doesn't have enough money. Has: " + player.money + ", Needs: " + property.cost);
            return false;
        }
        
        // Purchase the property
        player.money -= property.cost;
        property.ownerId = playerId;
        
        System.out.println("✅ Player " + player.name + " bought " + property.name + " for $" + property.cost);
        
        // Broadcast updated state
        broadcastState(room);
        saveState();
        
        return true;
    }
    
    // Charge rent when landing on owned property
    public synchronized void chargeRent(String roomId, String playerId, int propertyId) {
        Room room = rooms.get(roomId);
        if (room == null) return;
        
        Property property = room.properties.stream()
            .filter(p -> p.id == propertyId)
            .findFirst()
            .orElse(null);
        
        if (property == null || property.ownerId == null || property.ownerId.equals(playerId)) {
            return; // No rent if property is unowned or player owns it
        }
        
        Player tenant = room.players.get(playerId);
        Player landlord = room.players.get(property.ownerId);
        
        if (tenant == null || landlord == null) return;
        
        int rent = (int) Math.floor(property.cost * 0.1); // 10% of property cost
        
        tenant.money -= rent;
        landlord.money += rent;
        
        System.out.println("💸 " + tenant.name + " paid $" + rent + " rent to " + landlord.name + " for " + property.name);
        
        broadcastState(room);
        saveState();
    }
    
    // Ensure room exists and set admin principal for later matching
    public void ensureRoomWithAdminPrincipal(String roomId, String adminPrincipalEmail) {
        Room room = ensureRoom(roomId);
        if (room.adminPrincipal == null) {
            room.adminPrincipal = adminPrincipalEmail;
            saveState();
        }
    }
}