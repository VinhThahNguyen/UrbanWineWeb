package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.request.WineCreateRequest;
import com.urbanwine.sell_wine_express.dto.request.WineUpdateRequest;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineDetailResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineSummaryResponse;
import com.urbanwine.sell_wine_express.entity.Category;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.CategoryRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.WineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WineServiceImpl implements WineService {

    private final WineRepository wineRepository;
    private final CategoryRepository categoryRepository;


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

    // =========================================================================
    // UC_2.1.1 MANAGE WINE CATALOG (DÀNH CHO ADMIN)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WineAdminResponse> getAdminWineCatalog(
            String keyword, Integer categoryId, Boolean isActive, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        Page<Wine> winePage = wineRepository.findWinesForAdmin(cleanKeyword, categoryId, isActive, pageable);

        List<WineAdminResponse> content = winePage.getContent().stream()
                .map(this::mapToAdminResponse)
                .toList();

        return PageResponse.<WineAdminResponse>builder()
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
    public WineAdminResponse getAdminWineDetail(Long wineId) {
        Wine wine = wineRepository.findById(wineId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với mã ID: " + wineId));

        return mapToAdminResponse(wine);
    }

    @Override
    @Transactional
    public WineAdminResponse createWine(WineCreateRequest request) {
        // 1. Kiểm tra danh mục
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục rượu với mã ID: " + request.getCategoryId()));

        // 2. Ngoại lệ E2: Kiểm tra trùng lặp tên rượu (không phân biệt hoa/thường)
        Optional<Wine> existingWineOpt = wineRepository.findByWineNameIgnoreCase(request.getWineName().trim());
        if (existingWineOpt.isPresent()) {
            Wine existingWine = existingWineOpt.get();
            if (Boolean.TRUE.equals(existingWine.getIsActive())) {
                throw new IllegalArgumentException("Sản phẩm rượu '" + request.getWineName().trim() +
                        "' đã tồn tại và đang hoạt động (ID: " + existingWine.getWineId() +
                        "). Vui lòng cập nhật số lượng tồn kho thay vì tạo mới trùng lặp.");
            } else {
                throw new IllegalArgumentException("Sản phẩm rượu '" + request.getWineName().trim() +
                        "' đã tồn tại nhưng đang ở trạng thái ẩn (ID: " + existingWine.getWineId() +
                        "). Vui lòng kích hoạt lại sản phẩm thay vì tạo mới trùng lặp.");
            }
        }

        // 3. Khởi tạo và lưu sản phẩm mới (status mặc định là Active theo Alternative Flow bước 4)
        Wine newWine = Wine.builder()
                .wineName(request.getWineName().trim())
                .wineryName(request.getWineryName().trim())
                .category(category)
                .origin(request.getOrigin().trim())
                .grapeVariety(request.getGrapeVariety().trim())
                .vintageYear(request.getVintageYear())
                .description(request.getDescription().trim())
                .price(request.getPrice())
                .abv(request.getAbv())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl().trim())
                .isActive(true)
                .build();

        Wine savedWine = wineRepository.save(newWine);
        return mapToAdminResponse(savedWine);
    }

    @Override
    @Transactional
    public WineAdminResponse updateWine(Long wineId, WineUpdateRequest request) {
        // 1. Kiểm tra tồn tại
        Wine wine = wineRepository.findById(wineId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với mã ID: " + wineId));

        // 2. Kiểm tra danh mục
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục rượu với mã ID: " + request.getCategoryId()));

        // 3. Kiểm tra trùng lặp tên rượu nếu sửa tên trùng với sản phẩm khác
        if (wineRepository.existsByWineNameIgnoreCaseAndWineIdNot(request.getWineName().trim(), wineId)) {
            throw new IllegalArgumentException("Tên rượu '" + request.getWineName().trim() +
                    "' đã được sử dụng bởi một sản phẩm khác. Vui lòng chọn tên khác.");
        }

        // 4. Cập nhật thông tin chi tiết
        wine.setWineName(request.getWineName().trim());
        wine.setWineryName(request.getWineryName().trim());
        wine.setCategory(category);
        wine.setOrigin(request.getOrigin().trim());
        wine.setGrapeVariety(request.getGrapeVariety().trim());
        wine.setVintageYear(request.getVintageYear());
        wine.setDescription(request.getDescription().trim());
        wine.setPrice(request.getPrice());
        wine.setAbv(request.getAbv());
        wine.setImageUrl(request.getImageUrl().trim());

        // 5. Cộng dồn số lượng tồn kho nhập thêm (addedStockQuantity >= 0)
        int addedStock = (request.getAddedStockQuantity() != null) ? request.getAddedStockQuantity() : 0;
        int currentStock = (wine.getStockQuantity() != null) ? wine.getStockQuantity() : 0;
        wine.setStockQuantity(currentStock + addedStock);

        Wine updatedWine = wineRepository.save(wine);
        return mapToAdminResponse(updatedWine);
    }

    @Override
    @Transactional
    public WineAdminResponse toggleWineStatus(Long wineId) {
        Wine wine = wineRepository.findById(wineId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với mã ID: " + wineId));

        // Đảo ngược trạng thái kinh doanh
        boolean currentActive = Boolean.TRUE.equals(wine.getIsActive());
        wine.setIsActive(!currentActive);

        Wine updatedWine = wineRepository.save(wine);
        return mapToAdminResponse(updatedWine);
    }

    private WineAdminResponse mapToAdminResponse(Wine wine) {
        boolean outOfStock = wine.getStockQuantity() == null || wine.getStockQuantity() <= 0;

        return WineAdminResponse.builder()
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
                .stockQuantity(wine.getStockQuantity())
                .imageUrl(wine.getImageUrl())
                .isActive(wine.getIsActive())
                .isOutOfStock(outOfStock)
                .build();
    }
}

