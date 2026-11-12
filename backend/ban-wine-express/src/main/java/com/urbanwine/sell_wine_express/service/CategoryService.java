package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.respone.CategoryResponse;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();
}
