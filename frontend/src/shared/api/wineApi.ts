import { apiClient } from './client';

export interface BackendWineSummary {
  wineId: number;
  wineName: string;
  wineryName: string;
  categoryId: number;
  categoryName: string;
  origin?: string;
  vintageYear?: number;
  price: number;
  abv: number;
  stockQuantity?: number;
  imageUrl?: string;
  isOutOfStock: boolean;
  outOfStock?: boolean;
}

export interface BackendWineDetail {
  wineId: number;
  wineName: string;
  wineryName: string;
  categoryId: number;
  categoryName: string;
  origin?: string;
  grapeVariety?: string;
  vintageYear?: number;
  description?: string;
  price: number;
  abv: number;
  imageUrl?: string;
  stockQuantity: number;
  isOutOfStock: boolean;
  outOfStock?: boolean;
}

export interface BackendCategory {
  categoryId: number;
  categoryName: string;
  description?: string;
  count?: number;
  imageUrl?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const wineApi = {
  /**
   * Lấy danh mục rượu thật từ Database (có hỗ trợ lọc theo từ khóa, danh mục)
   */
  getCatalog: async (params?: {
    keyword?: string;
    categoryId?: number;
    page?: number;
    size?: number;
  }): Promise<PageResponse<BackendWineSummary>> => {
    const res = await apiClient.get<PageResponse<BackendWineSummary>>('/wines', {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 50,
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      },
    });
    return res.data;
  },

  /**
   * Lấy chi tiết chai rượu và số lượng tồn kho (stockQuantity) thời gian thực
   */
  getDetail: async (id: number | string): Promise<BackendWineDetail> => {
    const res = await apiClient.get<BackendWineDetail>(`/wines/${id}`);
    return res.data;
  },

  /**
   * Lấy danh sách thể loại từ Database
   */
  getCategories: async (): Promise<BackendCategory[]> => {
    const res = await apiClient.get<BackendCategory[]>('/categories');
    return res.data;
  },
};

/**
 * Hàm chuyển đổi từ DTO Backend sang đối tượng WineProduct của giao diện
 */
export const mapBackendWineToProduct = (item: BackendWineSummary): any => {
  const cat = (item.categoryName || '').toUpperCase();
  const mappedCategory: 'RED' | 'WHITE' | 'SPARKLING' | 'ROSE' | 'FORTIFIED' =
    cat.includes('WHITE') ? 'WHITE' :
    cat.includes('SPARKLING') || cat.includes('CHAMPAGNE') ? 'SPARKLING' :
    cat.includes('ROSE') || cat.includes('ROSÉ') ? 'ROSE' :
    cat.includes('FORTIFIED') || cat.includes('PORT') ? 'FORTIFIED' : 'RED';

  const originStr = item.origin || 'Bordeaux, France';
  const country = originStr.includes('France') ? 'France' :
    originStr.includes('Italy') ? 'Italy' :
    originStr.includes('Australia') ? 'Australia' :
    originStr.includes('Spain') ? 'Spain' :
    originStr.includes('USA') ? 'USA' : 'France';

  return {
    id: item.wineId,
    name: item.wineName,
    winery: item.wineryName || 'Urban Wine Cellar',
    category: mappedCategory,
    categoryName: item.categoryName || 'Fine Wine',
    vintage: item.vintageYear || 2018,
    region: originStr,
    country,
    price: Number(item.price),
    abv: item.abv || 13.5,
    volume: '750ml',
    stock: item.stockQuantity ?? (item.isOutOfStock ? 0 : 5),
    rating: 4.8,
    imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500',
    description: `${item.wineName} được tuyển chọn từ hầm rượu Urban Wine Express. Xuất xứ: ${originStr}.`,
    tastingNotes: ['Ghi chú hương vị thanh lịch', 'Cấu trúc tannin cân bằng', 'Hậu vị mượt mà'],
    foodPairing: ['Thịt bò thượng hạng', 'Phô mai cao cấp', 'Món âu cao cấp'],
  };
};
