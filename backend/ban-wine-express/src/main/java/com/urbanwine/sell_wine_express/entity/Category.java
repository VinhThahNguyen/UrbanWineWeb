package com.urbanwine.sell_wine_express.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "category_name", nullable = false, columnDefinition = "NVARCHAR(150)")
    private String categoryName;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;
}
