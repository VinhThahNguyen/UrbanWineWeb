package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;

/**
 * DTO phản hồi danh sách cảnh báo tồn kho thấp cho Admin (UC_2.1.3 View Stock Alert).
 * Chứa ngưỡng cảnh báo cố định (5 chai), thông điệp trạng thái kho (E1) và danh sách sản phẩm phân trang.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAlertResponse {

    /**
     * Ngưỡng tồn kho tối thiểu cảnh báo (cố định là 5 chai).
     */
    private int threshold;

    /**
     * Tổng số lượng sản phẩm chạm hoặc dưới ngưỡng cảnh báo.
     */
    private long totalAlerts;

    /**
     * Thông báo trạng thái kho:
     * - E1: Tồn kho ổn định nếu không có sản phẩm nào cần nhập thêm.
     * - Thông báo số lượng sản phẩm cần bổ sung nếu tồn kho <= 5 chai.
     */
    private String alertMessage;

    /**
     * Danh sách sản phẩm có tồn kho thấp kèm chi tiết (tên rượu, danh mục, số lượng còn lại,...)
     */
    private PageResponse<WineAdminResponse> wines;
}
