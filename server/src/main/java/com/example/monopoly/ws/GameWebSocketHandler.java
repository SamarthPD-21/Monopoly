package com.example.monopoly.ws;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.example.monopoly.service.GameService;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final GameService gameService;
    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);

    public GameWebSocketHandler(GameService gameService) {
        this.gameService = gameService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Principal p = session.getPrincipal();
        String room = getRoomIdFromSession(session);
        // persist roomId into session attributes so service methods can use it
        try { session.getAttributes().put("roomId", room); } catch (Exception ignored) {}
        log.info("WS open: session={} room={} principal={}", session.getId(), room, p != null ? p.getName() : "<anon>");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map payload = mapper.readValue(message.getPayload(), Map.class);
        Principal p = session.getPrincipal();
        log.debug("WS msg from session={} principal={} payload={}", session.getId(), p != null ? p.getName() : "<anon>", message.getPayload());
        String type = (String) payload.get("type");
        Map data = (Map) payload.get("payload");
        if ("join".equals(type)) {
            String name = data != null && data.get("name") != null ? (String) data.get("name") : "Player";
            Principal principal = session.getPrincipal();
            String preferredId = principal != null ? principal.getName() : null;
            String roomId = getRoomIdFromSession(session);
            String id = gameService.addPlayer(session, name, preferredId, roomId);
            // reply assigned id or error if full
            if (id == null) {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "joinResult", "payload", Map.of("success", false, "message", "room-full")))));
            } else {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "assigned", "payload", Map.of("id", id, "roomId", roomId)))));
            }
            broadcastState(session);
        } else if ("roll".equals(type)) {
            int dice = gameService.rollForSession(session);
            // optional: reply to roller with the dice result
            try {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "rollResult", "payload", Map.of("dice", dice)))));
            } catch (Exception ignored) {}
            broadcastState(session);
        } else if ("buy".equals(type)) {
            Map result = gameService.buyForSession(session);
            try {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "buyResult", "payload", result))));
            } catch (Exception ignored) {}
            broadcastState(session);
        } else if ("ready".equals(type)) {
            boolean r = false;
            if (data != null && data.get("ready") instanceof Boolean) r = (Boolean) data.get("ready");
            gameService.setReadyForSession(session, r);
            broadcastState(session);
        } else if ("kick".equals(type)) {
            String target = data != null && data.get("playerId") instanceof String ? (String) data.get("playerId") : null;
            boolean ok = false;
            if (target != null) ok = gameService.kickPlayer(session, target);
            try { session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "kickResult", "payload", Map.of("success", ok))))); } catch (Exception ignored) {}
            broadcastState(session);
        } else if ("setStartAmount".equals(type)) {
            Integer amt = null;
            if (data != null && data.get("amount") instanceof Number) amt = ((Number) data.get("amount")).intValue();
            boolean ok = false;
            if (amt != null) ok = gameService.setStartAmount(session, amt);
            try { session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "setStartAmountResult", "payload", Map.of("success", ok))))); } catch (Exception ignored) {}
            broadcastState(session);
        } else if ("start".equals(type)) {
            boolean ok = gameService.startForSession(session);
            try {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(Map.of("type", "startResult", "payload", Map.of("success", ok)))));
            } catch (Exception ignored) {}
            broadcastState(session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        gameService.removeSession(session);
        broadcastState(session);
        Principal p = session.getPrincipal();
        log.info("WS closed: session={} principal={} status={}", session.getId(), p != null ? p.getName() : "<anon>", status);
    }

    private void broadcastState(WebSocketSession session) {
        try {
            var state = gameService.getStateForRoom(session);
            var msg = Map.of("type", "state", "payload", state);
            var text = mapper.writeValueAsString(msg);
            gameService.broadcastToRoom(session, text);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String getRoomIdFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri == null) return "default";
            String q = uri.getQuery();
            if (q == null) return "default";
            for (String part : q.split("&")) {
                if (part.startsWith("room=")) {
                    return URLDecoder.decode(part.substring(5), StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) { /* ignore */ }
        return "default";
    }
}
