package com.urbanwine.sell_wine_express.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@Slf4j
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException {
        log.error("Lỗi từ chối truy cập (Access Denied): {}", accessDeniedException.getMessage());

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);

        String jsonResponse = String.format(
                "{\"timestamp\":\"%s\",\"status\":403,\"error\":\"Forbidden\",\"message\":\"Bạn không có quyền truy cập vào tài nguyên này\",\"path\":\"%s\"}",
                LocalDateTime.now(),
                request.getServletPath()
        );

        response.getWriter().write(jsonResponse);
    }
}
