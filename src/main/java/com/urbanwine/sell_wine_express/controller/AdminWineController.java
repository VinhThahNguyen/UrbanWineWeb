package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.WineCreateRequest;
import com.urbanwine.sell_wine_express.dto.request.WineUpdateRequest;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.StockAlertResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse;
import com.urbanwine.sell_wine_express.service.WineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller dành riêng cho Quản lý / Admin quản trị danh mục rượu (UC_2.1.1 Manage wine catalog).
 * Yêu cầu quyền: ROLE_ADMIN (BR-05).
 */
@RestController
@RequestMapping("/api/admin/wines")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminWineController {

    private final WineService wineService;

    /**
     * UC_2.1.1 Normal Flow - Bước 1 & 2:
     * Xem danh sách toàn bộ sản phẩm rượu trong hệ thống (gồm cả Active và Inactive).
     * Hỗ trợ tìm kiếm theo từ khóa, lọc theo danh mục (categoryId), lọc theo trạng thái (isActive) và phân trang.
     */
    @GetMapping
    public ResponseEntity<PageResponse<WineAdminResponse>> getAdminWineCatalog(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<WineAdminResponse> response = wineService.getAdminWineCatalog(keyword, categoryId, isActive, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.3 View Stock Alert:
     * Xem danh sách các sản phẩm rượu có lượng tồn kho chạm hoặc dưới ngưỡng cảnh báo (<= 5 chai).
     * Chỉ áp dụng cho các sản phẩm đang kinh doanh (isActive = true).
     * Hỗ trợ tìm kiếm theo keyword, categoryId và phân trang.
     * Ngoại lệ E1: Trả về thông điệp kho an toàn nếu không có sản phẩm nào thiếu rượu.
     */
    @GetMapping("/stock-alerts")
    public ResponseEntity<StockAlertResponse> getStockAlerts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        StockAlertResponse response = wineService.getStockAlerts(keyword, categoryId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Xem chi tiết thông tin một sản phẩm rượu trong danh mục quản trị.
     */
    @GetMapping("/{id}")
    public ResponseEntity<WineAdminResponse> getAdminWineDetail(@PathVariable("id") Long id) {
        WineAdminResponse response = wineService.getAdminWineDetail(id);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.1 Alternative Flow 1: Add a new wine product.
     * Thêm mới một sản phẩm rượu vào danh mục (mặc định trạng thái Active).
     * Kiểm tra ngoại lệ E1 (dữ liệu không hợp lệ) và E2 (trùng lặp sản phẩm).
     */
    @PostMapping
    public ResponseEntity<WineAdminResponse> createWine(@Valid @RequestBody WineCreateRequest request) {
        WineAdminResponse response = wineService.createWine(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * UC_2.1.1 Normal Flow - Bước 3, 4, 5, 6:
     * Cập nhật thông tin sản phẩm rượu (giá bán, mô tả, thông số,...)
     * và cộng dồn số lượng hàng mới nhập vào kho (addedStockQuantity).
     */
    @PutMapping("/{id}")
    public ResponseEntity<WineAdminResponse> updateWine(
            @PathVariable("id") Long id,
            @Valid @RequestBody WineUpdateRequest request
    ) {
        WineAdminResponse response = wineService.updateWine(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.1 Alternative Flow 2: Toggle product sales status (Hide or Reactivate).
     * Bật/tắt trạng thái kinh doanh của sản phẩm rượu (Active <-> Inactive).
     * Ẩn sản phẩm khỏi tìm kiếm của khách hàng mà không xóa bản ghi vĩnh viễn trong CSDL.
     */
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<WineAdminResponse> toggleWineStatus(@PathVariable("id") Long id) {
        WineAdminResponse response = wineService.toggleWineStatus(id);
        return ResponseEntity.ok(response);
    }
}
