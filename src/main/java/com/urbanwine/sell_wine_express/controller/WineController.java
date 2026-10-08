package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineDetailResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineSummaryResponse;
import com.urbanwine.sell_wine_express.service.WineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/wines")
@RequiredArgsConstructor
public class WineController {

    private final WineService wineService;

    /**
     * Lấy danh mục sản phẩm rượu có phân trang (Public API).
     * UC 2.2.1:
     * - Bước 2: Hiển thị catalog rượu (image, wineryName, category, price, abv, stock availability).
     * - Bước 3, 4: Lọc theo danh mục với param `categoryId`.
     * - Tìm kiếm theo từ khóa `keyword` (tên rượu, hãng sản xuất, xuất xứ).
     * - BR-05: Chỉ trả về rượu active.
     */
    @GetMapping
    public ResponseEntity<PageResponse<WineSummaryResponse>> getWineCatalog(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<WineSummaryResponse> response = wineService.getWineCatalog(keyword, categoryId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy thông tin chi tiết của một sản phẩm rượu (Public API).
     * UC 2.2.1:
     * - Bước 5, 6: Hiển thị xuất xứ, giống nho, niên vụ, abv, mô tả, số lượng tồn kho.
     * - E2: Trả về trạng thái outOfStock nếu stockQuantity = 0.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getWineDetail(@PathVariable("id") Long id) {
        try {
            WineDetailResponse response = wineService.getWineDetail(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
