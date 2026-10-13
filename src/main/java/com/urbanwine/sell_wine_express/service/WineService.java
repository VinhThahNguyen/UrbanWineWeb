package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineDetailResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineSummaryResponse;

public interface WineService {

    /**
     * Lấy danh mục sản phẩm rượu có phân trang.
     * Hỗ trợ tìm kiếm theo từ khóa và lọc theo danh mục.
     */
    PageResponse<WineSummaryResponse> getWineCatalog(String keyword, Integer categoryId, int page, int size);

    /**
     * Xem thông tin chi tiết một chai rượu theo ID.
     */
    WineDetailResponse getWineDetail(Long wineId);

    // =========================================================================
    // UC_2.1.1 MANAGE WINE CATALOG (DÀNH CHO ADMIN)
    // =========================================================================

    /**
     * Lấy danh sách rượu cho Admin với bộ lọc keyword, categoryId, isActive và phân trang.
     */
    PageResponse<com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse> getAdminWineCatalog(
            String keyword, Integer categoryId, Boolean isActive, int page, int size);

    /**
     * Xem thông tin chi tiết của rượu cho Admin (bao gồm cả rượu đang inactive).
     */
    com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse getAdminWineDetail(Long wineId);

    /**
     * Thêm mới một sản phẩm rượu vào catalog.
     */
    com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse createWine(
            com.urbanwine.sell_wine_express.dto.request.WineCreateRequest request);

    /**
     * Cập nhật thông tin chi tiết của sản phẩm rượu và cộng dồn tồn kho nếu có.
     */
    com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse updateWine(
            Long wineId, com.urbanwine.sell_wine_express.dto.request.WineUpdateRequest request);

    /**
     * Bật/tắt trạng thái kinh doanh của sản phẩm rượu (Active <-> Inactive).
     */
    com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse toggleWineStatus(Long wineId);
}

