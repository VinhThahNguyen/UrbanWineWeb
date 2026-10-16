package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.WineCreateRequest;
import com.urbanwine.sell_wine_express.dto.request.WineUpdateRequest;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.StockAlertResponse;
import com.urbanwine.sell_wine_express.dto.respone.WineAdminResponse;
import com.urbanwine.sell_wine_express.entity.Category;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.CategoryRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.impl.WineServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WineServiceAdminTest {

    @Mock
    private WineRepository wineRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private WineServiceImpl wineService;

    private Category testCategory;
    private Wine testWine;

    @BeforeEach
    void setUp() {
        testCategory = Category.builder()
                .categoryId(1)
                .categoryName("Vang Đỏ")
                .description("Các loại rượu vang đỏ cao cấp")
                .build();

        testWine = Wine.builder()
                .wineId(1L)
                .wineName("Chateau Margaux 2015")
                .wineryName("Chateau Margaux")
                .category(testCategory)
                .origin("Bordeaux, France")
                .grapeVariety("Cabernet Sauvignon")
                .vintageYear(2015)
                .description("Vang đỏ hảo hạng")
                .price(new BigDecimal("15000000"))
                .abv(13.5)
                .stockQuantity(20)
                .imageUrl("https://example.com/margaux.jpg")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Tạo rượu mới thành công khi dữ liệu hợp lệ và không trùng lặp")
    void testCreateWine_Success() {
        WineCreateRequest request = WineCreateRequest.builder()
                .wineName("Chateau Latour 2018")
                .wineryName("Chateau Latour")
                .categoryId(1)
                .origin("Pauillac, France")
                .grapeVariety("Cabernet Sauvignon")
                .vintageYear(2018)
                .description("Rượu vang đẳng cấp Grand Cru")
                .price(new BigDecimal("22000000"))
                .abv(14.0)
                .stockQuantity(10)
                .imageUrl("https://example.com/latour.jpg")
                .build();

        when(categoryRepository.findById(1)).thenReturn(Optional.of(testCategory));
        when(wineRepository.findByWineNameIgnoreCase("Chateau Latour 2018")).thenReturn(Optional.empty());
        when(wineRepository.save(any(Wine.class))).thenAnswer(invocation -> {
            Wine w = invocation.getArgument(0);
            w.setWineId(2L);
            return w;
        });

        WineAdminResponse response = wineService.createWine(request);

        assertNotNull(response);
        assertEquals(2L, response.getWineId());
        assertEquals("Chateau Latour 2018", response.getWineName());
        assertTrue(response.getIsActive());
        assertEquals(10, response.getStockQuantity());
        verify(wineRepository, times(1)).save(any(Wine.class));
    }

    @Test
    @DisplayName("Ngoại lệ E2: Tạo rượu mới bị từ chối khi tên rượu đã tồn tại và đang active")
    void testCreateWine_DuplicateActive_ThrowsException() {
        WineCreateRequest request = WineCreateRequest.builder()
                .wineName("Chateau Margaux 2015")
                .wineryName("Chateau Margaux")
                .categoryId(1)
                .origin("France")
                .grapeVariety("Cabernet Sauvignon")
                .price(new BigDecimal("15000000"))
                .abv(13.5)
                .stockQuantity(5)
                .description("Mô tả")
                .imageUrl("https://example.com/image.jpg")
                .build();

        when(categoryRepository.findById(1)).thenReturn(Optional.of(testCategory));
        when(wineRepository.findByWineNameIgnoreCase("Chateau Margaux 2015")).thenReturn(Optional.of(testWine));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> wineService.createWine(request));
        assertTrue(ex.getMessage().contains("đã tồn tại và đang hoạt động"));
        verify(wineRepository, never()).save(any(Wine.class));
    }

    @Test
    @DisplayName("Ngoại lệ E2: Tạo rượu mới bị từ chối khi tên rượu đã tồn tại ở trạng thái ẩn (inactive)")
    void testCreateWine_DuplicateInactive_ThrowsException() {
        testWine.setIsActive(false);

        WineCreateRequest request = WineCreateRequest.builder()
                .wineName("Chateau Margaux 2015")
                .wineryName("Chateau Margaux")
                .categoryId(1)
                .origin("France")
                .grapeVariety("Cabernet Sauvignon")
                .price(new BigDecimal("15000000"))
                .abv(13.5)
                .stockQuantity(5)
                .description("Mô tả")
                .imageUrl("https://example.com/image.jpg")
                .build();

        when(categoryRepository.findById(1)).thenReturn(Optional.of(testCategory));
        when(wineRepository.findByWineNameIgnoreCase("Chateau Margaux 2015")).thenReturn(Optional.of(testWine));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> wineService.createWine(request));
        assertTrue(ex.getMessage().contains("đã tồn tại nhưng đang ở trạng thái ẩn"));
        verify(wineRepository, never()).save(any(Wine.class));
    }

    @Test
    @DisplayName("Cập nhật thông tin rượu và cộng dồn số lượng hàng mới nhập thêm")
    void testUpdateWine_SuccessWithStockIncrement() {
        WineUpdateRequest request = WineUpdateRequest.builder()
                .wineName("Chateau Margaux 2015 Grand Vin")
                .wineryName("Chateau Margaux")
                .categoryId(1)
                .origin("Bordeaux, France")
                .grapeVariety("Cabernet Sauvignon")
                .vintageYear(2015)
                .description("Cập nhật mô tả mới")
                .price(new BigDecimal("16000000"))
                .abv(13.5)
                .addedStockQuantity(15) // Nhập thêm 15 chai vào 20 chai hiện có -> 35
                .imageUrl("https://example.com/margaux-new.jpg")
                .build();

        when(wineRepository.findById(1L)).thenReturn(Optional.of(testWine));
        when(categoryRepository.findById(1)).thenReturn(Optional.of(testCategory));
        when(wineRepository.existsByWineNameIgnoreCaseAndWineIdNot("Chateau Margaux 2015 Grand Vin", 1L)).thenReturn(false);
        when(wineRepository.save(any(Wine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WineAdminResponse response = wineService.updateWine(1L, request);

        assertNotNull(response);
        assertEquals("Chateau Margaux 2015 Grand Vin", response.getWineName());
        assertEquals(35, response.getStockQuantity()); // 20 + 15 = 35
        assertEquals(new BigDecimal("16000000"), response.getPrice());
        verify(wineRepository, times(1)).save(testWine);
    }

    @Test
    @DisplayName("Alternative Flow 2: Toggle trạng thái Active <-> Inactive")
    void testToggleWineStatus_Success() {
        assertTrue(testWine.getIsActive());

        when(wineRepository.findById(1L)).thenReturn(Optional.of(testWine));
        when(wineRepository.save(any(Wine.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Lần 1: Từ Active -> Inactive
        WineAdminResponse response1 = wineService.toggleWineStatus(1L);
        assertFalse(response1.getIsActive());

        // Lần 2: Từ Inactive -> Active
        WineAdminResponse response2 = wineService.toggleWineStatus(1L);
        assertTrue(response2.getIsActive());
    }

    @Test
    @DisplayName("Admin xem catalog có phân trang và bộ lọc trạng thái")
    void testGetAdminWineCatalog_Success() {
        when(wineRepository.findWinesForAdmin(eq("Margaux"), eq(1), eq(true), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testWine)));

        PageResponse<WineAdminResponse> result = wineService.getAdminWineCatalog("Margaux", 1, true, 0, 10);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("Chateau Margaux 2015", result.getContent().get(0).getWineName());
        assertTrue(result.getContent().get(0).getIsActive());
    }

    // =========================================================================
    // UC_2.1.3 VIEW STOCK ALERT UNIT TESTS
    // =========================================================================

    @Test
    @DisplayName("UC_2.1.3 Normal Flow: Lấy danh sách cảnh báo khi có sản phẩm tồn kho <= 5")
    void testGetStockAlerts_HasLowStockItems() {
        Wine lowStockWine = Wine.builder()
                .wineId(2L)
                .wineName("Penfolds Grange 2017")
                .wineryName("Penfolds")
                .category(testCategory)
                .stockQuantity(3)
                .price(new BigDecimal("18500000"))
                .isActive(true)
                .build();

        when(wineRepository.findLowStockWines(eq(5), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(lowStockWine)));

        StockAlertResponse response = wineService.getStockAlerts(null, null, 0, 10);

        assertNotNull(response);
        assertEquals(5, response.getThreshold());
        assertEquals(1, response.getTotalAlerts());
        assertTrue(response.getAlertMessage().contains("Có 1 sản phẩm đang thiếu rượu"));
        assertNotNull(response.getWines());
        assertEquals(1, response.getWines().getContent().size());
        assertEquals("Penfolds Grange 2017", response.getWines().getContent().get(0).getWineName());
        assertEquals(3, response.getWines().getContent().get(0).getStockQuantity());
    }

    @Test
    @DisplayName("UC_2.1.3 Ngoại lệ E1: Kho an toàn khi không có sản phẩm nào <= 5 chai")
    void testGetStockAlerts_EmptySafeStock_ExceptionE1() {
        when(wineRepository.findLowStockWines(eq(5), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        StockAlertResponse response = wineService.getStockAlerts(null, null, 0, 10);

        assertNotNull(response);
        assertEquals(5, response.getThreshold());
        assertEquals(0, response.getTotalAlerts());
        assertEquals("Tồn kho ổn định. Hiện tại không có sản phẩm nào cần nhập thêm.", response.getAlertMessage());
        assertTrue(response.getWines().getContent().isEmpty());
    }
}
