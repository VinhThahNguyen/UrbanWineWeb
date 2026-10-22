package com.urbanwine.sell_wine_express.config;

import com.urbanwine.sell_wine_express.entity.Category;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.repository.CategoryRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * DatabaseSeeder: Seeds rich mock data in English for wine categories and wine items.
 * Facilitates testing catalog browsing, category filtering, stock availability (E2),
 * and active status business rule (BR-05).
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final WineRepository wineRepository;

    @Override
    public void run(String... args) throws Exception {
        seedCategoriesAndWines();
    }

    private void seedCategoriesAndWines() {
        if (wineRepository.count() > 0) return;

        log.info("========== [DATABASE SEED] STARTING ENGLISH SAMPLE DATA SEEDING ==========");

        // 1. Categories in English
        Category redWine = buildCategory("Red Wine", "Rich, full-bodied and robust red wines fermented from dark-skinned grapes.");
        Category whiteWine = buildCategory("White Wine", "Crisp, elegant, and refreshing white wines with delicate fruity and floral notes.");
        Category sparklingWine = buildCategory("Sparkling Wine", "Celebratory sparkling wines, Champagne, and Prosecco featuring lively effervescence.");
        Category roseWine = buildCategory("Rosé Wine", "Charming pink-tinted wines offering a fresh blend of red berry freshness and crisp acidity.");
        Category dessertWine = buildCategory("Dessert & Fortified Wine", "Luscious sweet and fortified wines such as Port, Sherry, and late-harvest vintages.");

        categoryRepository.saveAll(List.of(redWine, whiteWine, sparklingWine, roseWine, dessertWine));

        // 2. Comprehensive Wine List in English (covering various countries, grapes, stock status, active status)
        List<Wine> sampleWines = List.of(
                // --- Red Wines ---
                Wine.builder()
                        .wineName("Château Margaux Premier Grand Cru Classé")
                        .wineryName("Château Margaux")
                        .origin("Bordeaux, France")
                        .grapeVariety("Cabernet Sauvignon, Merlot, Petit Verdot")
                        .vintageYear(2018)
                        .description("Extraordinary elegance featuring expressive aromas of ripe blackcurrant, dark violets, subtle cedar, and refined velvety tannins.")
                        .price(new BigDecimal("1850.00"))
                        .abv(13.5)
                        .stockQuantity(12)
                        .imageUrl("https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                Wine.builder()
                        .wineName("Penfolds Grange Shiraz")
                        .wineryName("Penfolds")
                        .origin("Barossa Valley, Australia")
                        .grapeVariety("Shiraz, Cabernet Sauvignon")
                        .vintageYear(2019)
                        .description("Iconic Australian powerhouse displaying intense dark plum, savory licorice, espresso roast, and monumental complexity.")
                        .price(new BigDecimal("950.00"))
                        .abv(14.5)
                        .stockQuantity(0) // E2: Out of stock
                        .imageUrl("https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                Wine.builder()
                        .wineName("Caymus Vineyards Cabernet Sauvignon")
                        .wineryName("Caymus Vineyards")
                        .origin("Napa Valley, California, USA")
                        .grapeVariety("Cabernet Sauvignon")
                        .vintageYear(2021)
                        .description("Opulent and lush with layers of ripe blackberry, cassis, rich vanilla bean, and silky cocoa nuances.")
                        .price(new BigDecimal("125.00"))
                        .abv(14.6)
                        .stockQuantity(25)
                        .imageUrl("https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                Wine.builder()
                        .wineName("Tignanello Toscana IGT")
                        .wineryName("Marchesi Antinori")
                        .origin("Tuscany, Italy")
                        .grapeVariety("Sangiovese, Cabernet Sauvignon, Cabernet Franc")
                        .vintageYear(2020)
                        .description("A benchmark Super Tuscan showing vibrant sour cherry, crushed herbs, tobacco leaf, and mineral precision.")
                        .price(new BigDecimal("165.00"))
                        .abv(14.0)
                        .stockQuantity(18)
                        .imageUrl("https://images.unsplash.com/photo-1569919659476-f0852f6834b7?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                Wine.builder()
                        .wineName("Catena Zapata Adrianna Vineyard Malbec")
                        .wineryName("Bodega Catena Zapata")
                        .origin("Mendoza, Argentina")
                        .grapeVariety("Malbec")
                        .vintageYear(2019)
                        .description("High-altitude brilliance offering blue floral aromas, ripe black cherries, flinty minerality, and fine-grained structure.")
                        .price(new BigDecimal("140.00"))
                        .abv(14.0)
                        .stockQuantity(0) // E2: Out of stock
                        .imageUrl("https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                Wine.builder()
                        .wineName("Domaine de la Romanée-Conti La Tâche")
                        .wineryName("Domaine de la Romanée-Conti")
                        .origin("Burgundy, France")
                        .grapeVariety("Pinot Noir")
                        .vintageYear(2017)
                        .description("Peerless ethereal Pinot Noir revealing wild strawberries, rose petals, truffle, and endless harmonious finish.")
                        .price(new BigDecimal("4900.00"))
                        .abv(13.0)
                        .stockQuantity(3)
                        .imageUrl("https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500")
                        .isActive(true)
                        .category(redWine)
                        .build(),

                // --- White Wines ---
                Wine.builder()
                        .wineName("Cloudy Bay Sauvignon Blanc")
                        .wineryName("Cloudy Bay")
                        .origin("Marlborough, New Zealand")
                        .grapeVariety("Sauvignon Blanc")
                        .vintageYear(2023)
                        .description("A vibrant, expressive white bursting with zesty kaffir lime, passionfruit, crisp lemongrass, and crystalline acidity.")
                        .price(new BigDecimal("38.00"))
                        .abv(13.0)
                        .stockQuantity(40)
                        .imageUrl("https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500")
                        .isActive(true)
                        .category(whiteWine)
                        .build(),

                Wine.builder()
                        .wineName("Louis Jadot Chablis Premier Cru")
                        .wineryName("Maison Louis Jadot")
                        .origin("Chablis, Burgundy, France")
                        .grapeVariety("Chardonnay")
                        .vintageYear(2022)
                        .description("Crisp, bone-dry and pure expression of limestone terroir with notes of green apple, wet stone, and lemon zest.")
                        .price(new BigDecimal("55.00"))
                        .abv(12.5)
                        .stockQuantity(20)
                        .imageUrl("https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=500")
                        .isActive(true)
                        .category(whiteWine)
                        .build(),

                Wine.builder()
                        .wineName("Dr. Loosen Wehlener Sonnenuhr Riesling Kabinett")
                        .wineryName("Weingut Dr. Loosen")
                        .origin("Mosel, Germany")
                        .grapeVariety("Riesling")
                        .vintageYear(2021)
                        .description("Delicately balanced off-dry Riesling bursting with white peach, slate minerality, and vibrant natural acidity.")
                        .price(new BigDecimal("32.00"))
                        .abv(8.5)
                        .stockQuantity(15)
                        .imageUrl("https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=500")
                        .isActive(true)
                        .category(whiteWine)
                        .build(),

                Wine.builder()
                        .wineName("Santa Margherita Pinot Grigio")
                        .wineryName("Santa Margherita")
                        .origin("Alto Adige, Italy")
                        .grapeVariety("Pinot Grigio")
                        .vintageYear(2022)
                        .description("Clean and crisp straw-yellow white wine with refreshing golden delicious apple aromas and a clean citrus finish.")
                        .price(new BigDecimal("26.00"))
                        .abv(12.5)
                        .stockQuantity(0) // E2: Out of stock
                        .imageUrl("https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500")
                        .isActive(true)
                        .category(whiteWine)
                        .build(),

                // --- Sparkling Wines ---
                Wine.builder()
                        .wineName("Dom Pérignon Vintage Brut")
                        .wineryName("Moët & Chandon")
                        .origin("Champagne, France")
                        .grapeVariety("Chardonnay, Pinot Noir")
                        .vintageYear(2013)
                        .description("Remarkable precision and tension with lingering toasted brioche, white flowers, citrus peel, and silken effervescence.")
                        .price(new BigDecimal("280.00"))
                        .abv(12.5)
                        .stockQuantity(14)
                        .imageUrl("https://images.unsplash.com/photo-1560512823-829485b8bf24?w=500")
                        .isActive(true)
                        .category(sparklingWine)
                        .build(),

                Wine.builder()
                        .wineName("Veuve Clicquot Yellow Label Brut")
                        .wineryName("Veuve Clicquot Ponsardin")
                        .origin("Champagne, France")
                        .grapeVariety("Pinot Noir, Chardonnay, Pinot Meunier")
                        .vintageYear(2021)
                        .description("Iconic Champagne offering strength and silkiness with aromas of yellow and white fruits, vanilla, and brioche.")
                        .price(new BigDecimal("72.00"))
                        .abv(12.0)
                        .stockQuantity(35)
                        .imageUrl("https://images.unsplash.com/photo-1560512823-829485b8bf24?w=500")
                        .isActive(true)
                        .category(sparklingWine)
                        .build(),

                Wine.builder()
                        .wineName("La Marca Prosecco Superiore DOCG")
                        .wineryName("La Marca")
                        .origin("Veneto, Italy")
                        .grapeVariety("Glera")
                        .vintageYear(2022)
                        .description("Sparkling Italian delight featuring ripe honeysuckle, golden apple, fresh peach, and a light refreshing sparkle.")
                        .price(new BigDecimal("22.00"))
                        .abv(11.0)
                        .stockQuantity(50)
                        .imageUrl("https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500")
                        .isActive(true)
                        .category(sparklingWine)
                        .build(),

                // --- Rosé Wines ---
                Wine.builder()
                        .wineName("Château d'Esclans Whispering Angel Rosé")
                        .wineryName("Château d'Esclans")
                        .origin("Côtes de Provence, France")
                        .grapeVariety("Grenache, Cinsault, Rolle")
                        .vintageYear(2022)
                        .description("World-renowned pale pink rosé featuring delicate red currant, citrus blossom, and a round, crisp dry profile.")
                        .price(new BigDecimal("28.00"))
                        .abv(13.0)
                        .stockQuantity(28)
                        .imageUrl("https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=500")
                        .isActive(true)
                        .category(roseWine)
                        .build(),

                Wine.builder()
                        .wineName("Miraval Côtes de Provence Rosé")
                        .wineryName("Château Miraval")
                        .origin("Provence, France")
                        .grapeVariety("Cinsault, Grenache, Syrah, Rolle")
                        .vintageYear(2022)
                        .description("Elegant pale pink with aromas of fresh red berries, delicate white flowers, and refreshing salinity.")
                        .price(new BigDecimal("30.00"))
                        .abv(13.0)
                        .stockQuantity(0) // E2: Out of stock
                        .imageUrl("https://images.unsplash.com/photo-1569919659476-f0852f6834b7?w=500")
                        .isActive(true)
                        .category(roseWine)
                        .build(),

                // --- Dessert & Fortified Wines ---
                Wine.builder()
                        .wineName("Château d'Yquem Premier Cru Supérieur")
                        .wineryName("Château d'Yquem")
                        .origin("Sauternes, Bordeaux, France")
                        .grapeVariety("Sémillon, Sauvignon Blanc")
                        .vintageYear(2016)
                        .description("The pinnacle of sweet wines with unmatched layers of apricot confit, candied citrus, acacia honey, and infinite length.")
                        .price(new BigDecimal("520.00"))
                        .abv(14.0)
                        .stockQuantity(6)
                        .imageUrl("https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500")
                        .isActive(true)
                        .category(dessertWine)
                        .build(),

                Wine.builder()
                        .wineName("Taylor Fladgate 20 Year Old Tawny Port")
                        .wineryName("Taylor Fladgate")
                        .origin("Douro Valley, Portugal")
                        .grapeVariety("Touriga Nacional, Touriga Francesa")
                        .vintageYear(2003)
                        .description("Matured in seasoned oak casks, showing opulent aromas of dried figs, walnuts, toffee, and warm spice.")
                        .price(new BigDecimal("68.00"))
                        .abv(20.0)
                        .stockQuantity(16)
                        .imageUrl("https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500")
                        .isActive(true)
                        .category(dessertWine)
                        .build(),

                // --- Inactive Test Wine (BR-05 verification) ---
                Wine.builder()
                        .wineName("Discontinued Vintage Reserve (Hidden)")
                        .wineryName("Old Cellar Estate")
                        .origin("Colchagua Valley, Chile")
                        .grapeVariety("Carménère")
                        .vintageYear(2015)
                        .description("Archived product used strictly to verify BR-05 rule (should not appear in public catalog).")
                        .price(new BigDecimal("45.00"))
                        .abv(13.5)
                        .stockQuantity(10)
                        .imageUrl("https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500")
                        .isActive(false) // BR-05: Inactive product
                        .category(redWine)
                        .build()
        );

        wineRepository.saveAll(sampleWines);
        log.info("========== [DATABASE SEED] SUCCESSFULLY SEEDED {} CATEGORIES AND {} WINES ==========", 5, sampleWines.size());
    }

    private Category buildCategory(String name, String description) {
        return Category.builder()
                .categoryName(name)
                .description(description)
                .build();
    }
}
