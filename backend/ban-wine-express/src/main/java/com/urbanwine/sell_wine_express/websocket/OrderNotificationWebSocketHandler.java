package com.urbanwine.sell_wine_express.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.urbanwine.sell_wine_express.dto.respone.OrderRealtimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Component
public class OrderNotificationWebSocketHandler extends TextWebSocketHandler {

    private final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper;

    public OrderNotificationWebSocketHandler() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("WebSocket connected: session id = {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            JsonNode jsonNode = objectMapper.readTree(payload);

            if (jsonNode.has("action") && "IDENTIFY".equalsIgnoreCase(jsonNode.get("action").asText())) {
                String email = jsonNode.has("email") ? jsonNode.get("email").asText() : null;
                if (email != null && !email.trim().isEmpty()) {
                    session.getAttributes().put("email", email.trim().toLowerCase());
                    log.info("WebSocket session {} identified as user email: {}", session.getId(), email);
                }
            }
        } catch (Exception e) {
            log.warn("Error parsing incoming WebSocket text message: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WebSocket disconnected: session id = {}, status = {}", session.getId(), status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("WebSocket transport error on session {}: {}", session.getId(), exception.getMessage());
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException ignored) {
        }
        sessions.remove(session);
    }

    /**
     * Broadcast notification to relevant users or all connected clients
     */
    public void sendOrderNotification(OrderRealtimeMessage message) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(message);
            TextMessage textMessage = new TextMessage(jsonPayload);

            String targetEmail = message.getCustomerEmail() != null ? message.getCustomerEmail().trim().toLowerCase() : null;

            log.info("Broadcasting WebSocket notification: type = {}, order = {}, target email = {}",
                    message.getType(), message.getOrderCode(), targetEmail);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    String sessionEmail = (String) session.getAttributes().get("email");
                    // Send if target email matches or if target is null (broadcast to all)
                    if (targetEmail == null || sessionEmail == null || targetEmail.equalsIgnoreCase(sessionEmail)) {
                        try {
                            session.sendMessage(textMessage);
                        } catch (IOException e) {
                            log.error("Failed to send WebSocket message to session {}: {}", session.getId(), e.getMessage());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error creating or broadcasting WebSocket message: {}", e.getMessage(), e);
        }
    }
}
