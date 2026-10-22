package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO yêu cầu cập nhật thông tin sản phẩm rượu (UC_2.1.1 Normal flow step 4).
 * Hỗ trợ cập nhật thông tin chi tiết và cộng dồn số lượng tồn kho nhập thêm (addedStockQuantity).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WineUpdateRequest {

    @NotBlank(message = "Tên sản phẩm rượu không được để trống")
    @Size(max = 150, message = "Tên sản phẩm rượu không được vượt quá 150 ký tự")
    private String wineName;

    @NotBlank(message = "Tên nhà sản xuất (winery) không được để trống")
    @Size(max = 150, message = "Tên nhà sản xuất không được vượt quá 150 ký tự")
    private String wineryName;

    @NotNull(message = "Mã danh mục rượu không được để trống")
    private Integer categoryId;

    @NotBlank(message = "Xuất xứ không được để trống")
    @Size(max = 100, message = "Xuất xứ không được vượt quá 100 ký tự")
    private String origin;

    @NotBlank(message = "Giống nho không được để trống")
    @Size(max = 100, message = "Giống nho không được vượt quá 100 ký tự")
    private String grapeVariety;

    // Không bắt buộc
    @Min(value = 1000, message = "Năm niên vụ không hợp lệ")
    private Integer vintageYear;

    @NotBlank(message = "Mô tả sản phẩm không được để trống")
    private String description;

    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(value = "0.01", message = "Giá bán phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Nồng độ cồn (ABV) không được để trống")
    @DecimalMin(value = "0.01", message = "Nồng độ cồn phải lớn hơn 0")
    @DecimalMax(value = "100.0", message = "Nồng độ cồn không được vượt quá 100%")
    private Double abv;

    /**
     * Số lượng hàng mới nhập thêm vào kho (cộng dồn vào tồn kho hiện tại).
     * Mặc định là 0 nếu chỉ sửa thông tin mà không nhập thêm hàng.
     */
    @Builder.Default
    @Min(value = 0, message = "Số lượng nhập thêm không được là số âm")
    private Integer addedStockQuantity = 0;

    @NotBlank(message = "Đường dẫn hình ảnh không được để trống")
    @Size(max = 500, message = "Đường dẫn hình ảnh không được vượt quá 500 ký tự")
    private String imageUrl;
}
