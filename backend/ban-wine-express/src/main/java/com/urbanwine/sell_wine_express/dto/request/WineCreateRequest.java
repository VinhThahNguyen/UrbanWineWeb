package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO yêu cầu thêm mới sản phẩm rượu (UC_2.1.1 Add a new wine product).
 * Tất cả các trường thông tin đều bắt buộc, ngoại trừ vintageYear (niên vụ).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WineCreateRequest {

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

    // Không bắt buộc, có thể null đối với các dòng rượu cổ/không xác định năm
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

    @NotNull(message = "Số lượng tồn kho ban đầu không được để trống")
    @Min(value = 0, message = "Số lượng tồn kho không được là số âm")
    private Integer stockQuantity;

    @NotBlank(message = "Đường dẫn hình ảnh không được để trống")
    @Size(max = 500, message = "Đường dẫn hình ảnh không được vượt quá 500 ký tự")
    private String imageUrl;
}
