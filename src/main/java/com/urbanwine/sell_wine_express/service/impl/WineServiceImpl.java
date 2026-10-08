package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineDetailResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineSummaryResponse;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.WineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WineServiceImpl implements WineService {

    private final WineRepository wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WineSummaryResponse> getWineCatalog(String keyword, Integer categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Wine> winePage;
        boolean hasKeyword = keyword != null && !keyword.trim().isEmpty();

        if (hasKeyword && categoryId != null) {
            // Có cả từ khóa tìm kiếm và lọc theo danh mục
            winePage = wineRepository.searchByKeywordAndCategory(keyword.trim(), categoryId, pageable);
        } else if (hasKeyword) {
            // Chỉ tìm kiếm theo từ khóa
            winePage = wineRepository.searchByKeyword(keyword.trim(), pageable);
        } else if (categoryId != null) {
            // Chỉ lọc theo danh mục
            winePage = wineRepository.findByCategoryCategoryIdAndIsActiveTrue(categoryId, pageable);
        } else {
            // Lấy tất cả rượu active mặc định
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

    @Override
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
