export interface WineProduct {
  id: string | number;
  name: string;
  winery: string;
  category: 'RED' | 'WHITE' | 'SPARKLING';
  categoryName: string;
  vintage: number;
  region: string;
  country: string;
  price: number;
  abv: number;
  volume: string;
  stock: number;
  rating: number;
  imageUrl: string;
  description: string;
  tastingNotes: string[];
  foodPairing: string[];
}

export const initialWines: WineProduct[] = [
  {
    id: 1,
    name: 'Château Margaux',
    winery: 'Château Margaux',
    category: 'RED',
    categoryName: 'Red Wine',
    vintage: 2018,
    region: 'Margaux, Bordeaux',
    country: 'France',
    price: 8500000,
    abv: 14.0,
    volume: '750ml',
    stock: 8,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    description: 'A first-growth Bordeaux of unparalleled elegance. The 2018 vintage showcases dark fruit complexity intertwined with cedar and tobacco, finishing with the velvet smoothness Margaux is renowned for worldwide.',
    tastingNotes: ['Dark Cherry', 'Tobacco', 'Cedar Box', 'Velvet Finish'],
    foodPairing: ['Beef Tenderloin', 'Aged Comté', 'Roasted Lamb'],
  },
  {
    id: 2,
    name: 'Sassicaia',
    winery: 'Tenuta San Guido',
    category: 'RED',
    categoryName: 'Red Wine',
    vintage: 2019,
    region: 'Bolgheri, Tuscany',
    country: 'Italy',
    price: 4800000,
    abv: 13.5,
    volume: '750ml',
    stock: 12,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    description: 'The benchmark of Super Tuscan wines. Sassicaia exhibits intense aromas of cassis, blackberry, spiced minerals, and aristocratic French oak notes.',
    tastingNotes: ['Blackberry', 'Cassis', 'French Oak', 'Spice'],
    foodPairing: ['Florentine Steak', 'Wild Boar Ragù', 'Parmigiano Reggiano'],
  },
  {
    id: 3,
    name: 'Dom Pérignon',
    winery: 'Moët & Chandon',
    category: 'SPARKLING',
    categoryName: 'Sparkling Wine',
    vintage: 2013,
    region: 'Épernay, Champagne',
    country: 'France',
    price: 5200000,
    abv: 12.5,
    volume: '750ml',
    stock: 6,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=800&q=80',
    description: 'Vintage Champagne par excellence. Delicate effervescence unfolds into aromas of brioche, white flowers, citrus peel, and chalky salinity.',
    tastingNotes: ['Brioche', 'White Peach', 'Citrus Peel', 'Chalky Mineral'],
    foodPairing: ['Caviar', 'Fresh Oysters', 'Lobster Thermidor'],
  },
  {
    id: 4,
    name: 'Louis Latour Puligny-Montrachet',
    winery: 'Maison Louis Latour',
    category: 'WHITE',
    categoryName: 'White Wine',
    vintage: 2020,
    region: 'Côte de Beaune, Burgundy',
    country: 'France',
    price: 3600000,
    abv: 13.0,
    volume: '750ml',
    stock: 10,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80',
    description: 'An exceptional Chardonnay offering hazelnut, roasted almond, and toasted vanilla aromas, underscored by lively lemon zest acidity.',
    tastingNotes: ['Hazelnut', 'Toasted Vanilla', 'Meyer Lemon', 'Butter'],
    foodPairing: ['Pan-seared Scallops', 'Turbot with Butter Sauce', 'Roast Chicken'],
  },
  {
    id: 5,
    name: 'Opus One',
    winery: 'Opus One Winery',
    category: 'RED',
    categoryName: 'Red Wine',
    vintage: 2019,
    region: 'Napa Valley, California',
    country: 'United States',
    price: 9200000,
    abv: 14.5,
    volume: '750ml',
    stock: 5,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80',
    description: 'A harmonious Bordeaux blend crafted in Napa Valley. Complex notes of dark plum, espresso, dark chocolate, and polished fine-grained tannins.',
    tastingNotes: ['Dark Plum', 'Espresso', 'Dark Chocolate', 'Sage'],
    foodPairing: ['Prime Ribeye', 'Venison', 'Truffle Risotto'],
  },
  {
    id: 6,
    name: 'Cloudy Bay Sauvignon Blanc',
    winery: 'Cloudy Bay Vineyards',
    category: 'WHITE',
    categoryName: 'White Wine',
    vintage: 2022,
    region: 'Marlborough',
    country: 'New Zealand',
    price: 1850000,
    abv: 13.0,
    volume: '750ml',
    stock: 15,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?auto=format&fit=crop&w=800&q=80',
    description: 'The global standard for Marlborough Sauvignon Blanc. Vibrant tropical passion fruit, lime blossom, and fresh lemongrass with electric mineral tension.',
    tastingNotes: ['Passion Fruit', 'Lemongrass', 'Lime Zest', 'Flint'],
    foodPairing: ['Goat Cheese Crostini', 'Vietnamese Spring Rolls', 'Grilled Prawns'],
  },
];
