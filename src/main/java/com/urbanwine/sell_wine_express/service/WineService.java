package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineDetailResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineSummaryResponse;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WineService {

    private final WineRepository wineRepository;

    /**
     * Lấy danh mục sản phẩm rượu có phân trang (UC 2.2.1 - Bước 2, Bước 4).
     * Chỉ lấy rượu active (BR-05).
     * Hỗ trợ lọc theo categoryId nếu có.
     * Tự động tính toán trạng thái hết hàng (E2).
     */
    @Transactional(readOnly = true)
    public PageResponse<WineSummaryResponse> getWineCatalog(Integer categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Wine> winePage;
        if (categoryId != null) {
            // Bước 3, 4: Lọc theo danh mục đã chọn
            winePage = wineRepository.findByCategoryCategoryIdAndIsActiveTrue(categoryId, pageable);
        } else {
            // Bước 2: Hiển thị toàn bộ danh mục rượu active
            winePage = wineRepository.findByIsActiveTrue(pageable);
        }

        List<WineSummaryResponse> content = winePage.getContent().stream()
                .map(this::mapToSummaryResponse)
                .toList();

        return PageResponse.<WineSummaryResponse>builder()
                .content(content)
                .pageNumber(winePage.getNumber())
                .pageSize(winePage.getSize())
                .totalElements(winePage.getTotalElements())
                .totalPages(winePage.getTotalPages())
                .isLast(winePage.isLast())
                .build();
    }

    /**
     * Xem thông tin chi tiết một chai rượu (UC 2.2.1 - Bước 5, Bước 6).
     * Chỉ cho phép xem nếu sản phẩm active (BR-05).
     * Tính toán cờ hết hàng isOutOfStock (E2).
     */
    @Transactional(readOnly = true)
    public WineDetailResponse getWineDetail(Long wineId) {
        Wine wine = wineRepository.findByWineIdAndIsActiveTrue(wineId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm rượu với mã ID: " + wineId));

        return mapToDetailResponse(wine);
    }

    private WineSummaryResponse mapToSummaryResponse(Wine wine) {
        boolean outOfStock = wine.getStockQuantity() == null || wine.getStockQuantity() <= 0;

        return WineSummaryResponse.builder()
                .wineId(wine.getWineId())
                .wineName(wine.getWineName())
                .wineryName(wine.getWineryName())
                .categoryId(wine.getCategory() != null ? wine.getCategory().getCategoryId() : null)
                .categoryName(wine.getCategory() != null ? wine.getCategory().getCategoryName() : null)
                .price(wine.getPrice())
                .abv(wine.getAbv())
                .imageUrl(wine.getImageUrl())
                .isOutOfStock(outOfStock) // Ngoại lệ E2
                .build();
    }

    private WineDetailResponse mapToDetailResponse(Wine wine) {
        boolean outOfStock = wine.getStockQuantity() == null || wine.getStockQuantity() <= 0;

        return WineDetailResponse.builder()
                .wineId(wine.getWineId())
                .wineName(wine.getWineName())
                .wineryName(wine.getWineryName())
                .categoryId(wine.getCategory() != null ? wine.getCategory().getCategoryId() : null)
                .categoryName(wine.getCategory() != null ? wine.getCategory().getCategoryName() : null)
                .origin(wine.getOrigin())
                .grapeVariety(wine.getGrapeVariety())
                .vintageYear(wine.getVintageYear())
                .description(wine.getDescription())
                .price(wine.getPrice())
                .abv(wine.getAbv())
                .imageUrl(wine.getImageUrl())
                .stockQuantity(wine.getStockQuantity())
                .isOutOfStock(outOfStock) // Ngoại lệ E2
                .build();
    }
}
