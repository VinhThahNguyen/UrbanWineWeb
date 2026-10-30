package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.respone.CategoryResponse;
import com.urbanwine.sell_wine_express.repository.CategoryRepository;
import com.urbanwine.sell_wine_express.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(category -> CategoryResponse.builder()
                        .categoryId(category.getCategoryId())
                        .categoryName(category.getCategoryName())
                        .description(category.getDescription())
                        .build())
                .toList();
    }
}

