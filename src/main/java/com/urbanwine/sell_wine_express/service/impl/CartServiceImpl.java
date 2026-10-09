package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.request.AddCartItemRequest;
import com.urbanwine.sell_wine_express.dto.request.UpdateCartItemRequest;
import com.urbanwine.sell_wine_express.dto.respone.CartItemResponse;
import com.urbanwine.sell_wine_express.dto.respone.CartResponse;
import com.urbanwine.sell_wine_express.entity.Cart;
import com.urbanwine.sell_wine_express.entity.CartItem;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.CartItemRepository;
import com.urbanwine.sell_wine_express.repository.CartRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final WineRepository wineRepository;

    /**
     * Lấy hoặc tự động tạo giỏ hàng cho User nếu chưa có.
     */
    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUser(user)
                .orElseGet(() -> cartRepository.save(
                        Cart.builder()
                                .user(user)
                                .items(new ArrayList<>())
                                .build()
                ));
    }

    /**
     * Chuyển đổi Cart Entity sang CartResponse (tính subtotal và mapping chi tiết).
     */
    private CartResponse mapToCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal cartSubtotal = BigDecimal.ZERO;
        int totalQuantity = 0;

        if (cart.getItems() != null) {
            for (CartItem item : cart.getItems()) {
                Wine wine = item.getWine();
                BigDecimal itemSubtotal = wine.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                cartSubtotal = cartSubtotal.add(itemSubtotal);
                totalQuantity += item.getQuantity();

                itemResponses.add(CartItemResponse.builder()
                        .cartItemId(item.getCartItemId())
                        .wineId(wine.getWineId())
                        .wineName(wine.getWineName())
                        .imageUrl(wine.getImageUrl())
                        .price(wine.getPrice())
                        .quantity(item.getQuantity())
                        .stockQuantity(wine.getStockQuantity())
                        .itemSubtotal(itemSubtotal)
                        .build());
            }
        }

        return CartResponse.builder()
                .cartId(cart.getCartId())
                .items(itemResponses)
                .totalItems(totalQuantity)
                .cartSubtotal(cartSubtotal)
                .build();
    }
    

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(User user) {
        Cart cart = getOrCreateCart(user);
        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse addItemToCart(User user, AddCartItemRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Số lượng tối thiểu là 1, muốn xóa hãy bấm nút Xóa");
        }

        Wine wine = wineRepository.findById(request.getWineId())
                .orElseThrow(() -> new RuntimeException("Sản phẩm rượu không tồn tại"));

        if (!wine.getIsActive()) {
            throw new RuntimeException("Sản phẩm rượu hiện không còn kinh doanh");
        }

        Cart cart = getOrCreateCart(user);

        // Tìm xem sản phẩm đã có trong giỏ chưa
        CartItem cartItem = cartItemRepository.findByCartCartIdAndWineWineId(cart.getCartId(), wine.getWineId())
                .orElse(null);

        int currentQtyInCart = (cartItem != null) ? cartItem.getQuantity() : 0;
        int targetQty = currentQtyInCart + request.getQuantity();

        // Kiểm tra tồn kho E2
        if (targetQty > wine.getStockQuantity()) {
            throw new RuntimeException("Số lượng trong kho chỉ còn " + wine.getStockQuantity() + " sản phẩm, vui lòng chọn lại");
        }

        if (cartItem == null) {
            cartItem = CartItem.builder()
                    .cart(cart)
                    .wine(wine)
                    .quantity(request.getQuantity())
                    .build();
            cart.getItems().add(cartItem);
        } else {
            cartItem.setQuantity(targetQty);
        }

        cartItemRepository.save(cartItem);
        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse updateItemQuantity(User user, Long cartItemId, UpdateCartItemRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Số lượng tối thiểu là 1, muốn xóa hãy bấm nút Xóa");
        }

        Cart cart = getOrCreateCart(user);

        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Món hàng không tồn tại trong giỏ"));

        // Đảm bảo món hàng thuộc giỏ của user này
        if (!cartItem.getCart().getCartId().equals(cart.getCartId())) {
            throw new RuntimeException("Bạn không có quyền thao tác trên món hàng này");
        }

        Wine wine = cartItem.getWine();

        // Kiểm tra tồn kho E2: nếu vượt quá tồn kho -> giữ nguyên và báo lỗi
        if (request.getQuantity() > wine.getStockQuantity()) {
            throw new RuntimeException("Số lượng trong kho chỉ còn " + wine.getStockQuantity() + " sản phẩm, vui lòng chọn lại");
        }

        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);

        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeItemFromCart(User user, Long cartItemId) {
        Cart cart = getOrCreateCart(user);

        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Món hàng không tồn tại trong giỏ"));

        if (!cartItem.getCart().getCartId().equals(cart.getCartId())) {
            throw new RuntimeException("Bạn không có quyền thao tác trên món hàng này");
        }

        cart.getItems().remove(cartItem);
        cartItemRepository.delete(cartItem);

        return mapToCartResponse(cart);
    }
}
