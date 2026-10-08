package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Wine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WineRepository extends JpaRepository<Wine, Long> {

    // BR-05: Lấy tất cả các sản phẩm rượu đang active có phân trang
    Page<Wine> findByIsActiveTrue(Pageable pageable);

    // Bước 3, 4: Lọc rượu active theo Category có phân trang
    Page<Wine> findByCategoryCategoryIdAndIsActiveTrue(Integer categoryId, Pageable pageable);

    // Bước 5, 6: Lấy chi tiết rượu theo id và phải đang active
    Optional<Wine> findByWineIdAndIsActiveTrue(Long wineId);
}
