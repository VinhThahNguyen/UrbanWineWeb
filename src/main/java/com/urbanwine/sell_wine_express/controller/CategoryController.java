package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.respone.CategoryResponse;
import com.urbanwine.sell_wine_express.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Lấy danh sách toàn bộ các danh mục rượu (Public API).
     * Phục vụ bộ lọc danh mục ở bước 3 trong UC 2.2.1.
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }
}
