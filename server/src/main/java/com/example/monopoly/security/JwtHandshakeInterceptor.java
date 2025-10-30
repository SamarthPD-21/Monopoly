package com.example.monopoly.security;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

public class JwtHandshakeInterceptor implements HandshakeInterceptor {
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        // try to extract token from query params
        var uri = request.getURI();
        var query = uri.getQuery();
        if (query != null) {
            for (String part : query.split("&")) {
                String[] kv = part.split("=");
                if (kv.length == 2 && "token".equals(kv[0])) {
                    try {
                        String token = java.net.URLDecoder.decode(kv[1], java.nio.charset.StandardCharsets.UTF_8);
                        String username = JwtUtil.getUsername(token);
                        if (username != null) {
                            // set a simple principal
                            attributes.put("principal", new SimplePrincipal(username));
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {

    }

    private static class SimplePrincipal implements Principal {
        private final String name;
        public SimplePrincipal(String name) {
            this.name = name;
        }
        @Override
        public String getName() { return name; }
    }
}
