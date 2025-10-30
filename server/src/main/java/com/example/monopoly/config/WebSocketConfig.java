package com.example.monopoly.config;

import java.security.Principal;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import com.example.monopoly.security.JwtUtil;
import com.example.monopoly.ws.GameWebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameWebSocketHandler handler;
    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    public WebSocketConfig(GameWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Custom handshake handler to read token query param and set Principal
        DefaultHandshakeHandler dh = new DefaultHandshakeHandler() {
            @Override
            protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
                try {
                    var uri = request.getURI();
                    var query = uri.getQuery();
                    if (query != null) {
                        for (String part : query.split("&")) {
                            String[] kv = part.split("=");
                            if (kv.length == 2 && "token".equals(kv[0])) {
                                String encoded = kv[1];
                                try {
                                    String token = java.net.URLDecoder.decode(encoded, java.nio.charset.StandardCharsets.UTF_8);
                                    try {
                                        String username = JwtUtil.getUsername(token);
                                        if (username != null) {
                                            log.info("WebSocket handshake: token accepted for user={}", username);
                                            return () -> username;
                                        } else {
                                            log.warn("WebSocket handshake: token validated but no username found");
                                        }
                                    } catch (Exception ex) {
                                        // give a helpful log message without printing the token
                                        log.warn("WebSocket handshake: failed to parse/validate token ({}): {}", encoded.length() > 8 ? (encoded.substring(0, 6) + "...") : encoded, ex.getMessage());
                                    }
                                } catch (Exception ex) {
                                    log.warn("WebSocket handshake: failed to URL-decode token query param: {}", ex.getMessage());
                                }
                            }
                        }
                    } else {
                        log.debug("WebSocket handshake: no query string present on request {}", request.getURI());
                    }
                } catch (Exception ex) {
                    log.error("WebSocket handshake: unexpected error while parsing token: {}", ex.getMessage());
                }
                return super.determineUser(request, wsHandler, attributes);
            }
        };

        registry.addHandler(handler, "/game").setHandshakeHandler(dh).setAllowedOrigins("*");
    }
}
