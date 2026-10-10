package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.AddCartItemRequest;
import com.urbanwine.sell_wine_express.dto.request.UpdateCartItemRequest;
import com.urbanwine.sell_wine_express.dto.respone.CartResponse;
import com.urbanwine.sell_wine_express.entity.User;

import java.util.List;

public interface CartService {
    CartResponse getCart(User user);
    CartResponse addItemToCart(User user, AddCartItemRequest request);
    CartResponse updateItemQuantity(User user, Long cartItemId, UpdateCartItemRequest request);
    CartResponse removeItemFromCart(User user, Long cartItemId);
    void clearPurchasedItems(User user, List<Long> wineIds);
}

