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
}
