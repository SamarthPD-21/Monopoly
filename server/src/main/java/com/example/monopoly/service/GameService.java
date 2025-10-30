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
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GameService {
    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Path persistPath = Paths.get("game-state.json");

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

        public Room(String id) { this.id = id; }
    }

    // create or return room and ensure default properties
    private Room ensureRoom(String roomId) {
        return rooms.computeIfAbsent(roomId, (k) -> {
            Room r = new Room(k);
            // create 36-space board by default
            for (int i = 0; i < 36; i++) r.properties.add(new Property(i, "Tile " + i, 100 + (i % 12) * 25));
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
        }
        room.sessions.put(session.getId(), session);
        session.getAttributes().put("playerId", id);
        session.getAttributes().put("roomId", roomId);
        room.readyStates.put(id, false);
        saveState();
        return id;
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
            if (allReady) room.started = true;
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
        Player p = room.players.get((String) pid);
        if (p == null) return -1;
        int dice = 1 + new Random().nextInt(6);
        int boardSize = room.properties.isEmpty() ? 12 : room.properties.size();
        p.pos = (p.pos + dice) % boardSize;
        room.lastMove = Map.of("playerId", p.id, "dice", dice);
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
            props.add(Map.of("id", pr.id, "name", pr.name, "cost", pr.cost, "ownerId", pr.ownerId));
        }
        return Map.of("players", playersWithMoney, "properties", props, "lastMove", room.lastMove, "started", room.started, "adminId", room.adminId, "startAmount", room.startAmount);
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
        // only host (first player added) can force-start
        String hostId = null;
        for (String k : room.players.keySet()) { hostId = k; break; }
        if (hostId == null || !hostId.equals(pid)) return false;
        room.started = true;
        saveState();
        return true;
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
        for (Property pr : r.properties) out.add(Map.of("id", pr.id, "name", pr.name, "cost", pr.cost, "ownerId", pr.ownerId));
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
}