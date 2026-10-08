package com.urbanwine.sell_wine_express.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "wines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wine_id")
    private Long wineId;

    @Column(name = "wine_name", nullable = false, length = 150)
    private String wineName;

    @Column(name = "winery_name", nullable = false, length = 150)
    private String wineryName;

    @Column(name = "origin", length = 100)
    private String origin;

    @Column(name = "grape_variety", length = 100)
    private String grapeVariety;

    @Column(name = "vintage_year")
    private Integer vintageYear;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "abv")
    private Double abv;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;
}