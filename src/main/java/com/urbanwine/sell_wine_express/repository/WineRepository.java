package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Wine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WineRepository extends JpaRepository<Wine, Long> {

    // BR-05: Lấy tất cả các sản phẩm rượu đang active có phân trang
    Page<Wine> findByIsActiveTrue(Pageable pageable);

    // Bước 3, 4: Lọc rượu active theo Category có phân trang
    Page<Wine> findByCategoryCategoryIdAndIsActiveTrue(Integer categoryId, Pageable pageable);

    // Tìm kiếm rượu theo từ khóa (tên rượu, nhà làm rượu, xuất xứ)
    @Query("SELECT w FROM Wine w WHERE w.isActive = true AND " +
           "(LOWER(w.wineName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(w.wineryName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(w.origin) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Wine> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // Tìm kiếm rượu theo từ khóa VÀ theo danh mục categoryId
    @Query("SELECT w FROM Wine w WHERE w.isActive = true AND w.category.categoryId = :categoryId AND " +
           "(LOWER(w.wineName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(w.wineryName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(w.origin) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Wine> searchByKeywordAndCategory(@Param("keyword") String keyword, 
                                          @Param("categoryId") Integer categoryId, 
                                          Pageable pageable);

    // Bước 5, 6: Lấy chi tiết rượu theo id và phải đang active
    Optional<Wine> findByWineIdAndIsActiveTrue(Long wineId);
}
