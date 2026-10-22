package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.AddCartItemRequest;
import com.urbanwine.sell_wine_express.dto.request.UpdateCartItemRequest;
import com.urbanwine.sell_wine_express.dto.respone.CartResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /**
     * Xem thông tin giỏ hàng hiện tại (Normal Flow: Step 4).
     */
    @GetMapping
    public ResponseEntity<?> getCart(@AuthenticationPrincipal User user) {
        try {
            CartResponse response = cartService.getCart(user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Thêm rượu vào giỏ hàng (Normal Flow: Step 1, 2, 3, 4).
     */
    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AddCartItemRequest request
    ) {
        try {
            CartResponse response = cartService.addItemToCart(user, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cập nhật số lượng của một món trong giỏ (Alternative Flow: Update quantity).
     */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateItemQuantity(
            @AuthenticationPrincipal User user,
            @PathVariable("itemId") Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        try {
            CartResponse response = cartService.updateItemQuantity(user, itemId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Xóa một món khỏi giỏ hàng (Alternative Flow: Remove item).
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItemFromCart(
            @AuthenticationPrincipal User user,
            @PathVariable("itemId") Long itemId
    ) {
        try {
            CartResponse response = cartService.removeItemFromCart(user, itemId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
