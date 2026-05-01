// City data for CityFind game.
// Each city has multiple Wikimedia Commons image URLs (free, no API key)
// plus accepted name aliases for guessing in English/Hebrew.

export interface CityData {
  id: string;
  name_en: string;
  name_he: string;
  country_en: string;
  country_he: string;
  flag: string;
  difficulty: number; // 1..20
  aliases: string[]; // lowercase
  // Public Wikimedia Commons image URLs
  images: string[];
}

// Image URLs from Wikimedia Commons (public domain or CC-licensed photos
// commonly used on Wikipedia city articles)
export const CITIES: CityData[] = [
  {
    id: "tel-aviv",
    name_en: "Tel Aviv",
    name_he: "תל אביב",
    country_en: "Israel",
    country_he: "ישראל",
    flag: "🇮🇱",
    difficulty: 3,
    aliases: ["tel aviv", "telaviv", "tel-aviv", "תל אביב", "תל-אביב", "tlv"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Tel_Aviv_Skyline.jpg/1280px-Tel_Aviv_Skyline.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Tel_Aviv_Beach_Promenade.jpg/1280px-Tel_Aviv_Beach_Promenade.jpg",
    ],
  },
  {
    id: "paris",
    name_en: "Paris",
    name_he: "פריז",
    country_en: "France",
    country_he: "צרפת",
    flag: "🇫🇷",
    difficulty: 1,
    aliases: ["paris", "פריז", "פריס"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/800px-Tour_Eiffel_Wikimedia_Commons.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Paris_Night.jpg/1280px-Paris_Night.jpg",
    ],
  },
  {
    id: "london",
    name_en: "London",
    name_he: "לונדון",
    country_en: "United Kingdom",
    country_he: "בריטניה",
    flag: "🇬🇧",
    difficulty: 1,
    aliases: ["london", "לונדון"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Palace_of_Westminster_from_the_dome_on_Methodist_Central_Hall.jpg/1280px-Palace_of_Westminster_from_the_dome_on_Methodist_Central_Hall.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Tower_Bridge_from_Shad_Thames.jpg/1280px-Tower_Bridge_from_Shad_Thames.jpg",
    ],
  },
  {
    id: "new-york",
    name_en: "New York",
    name_he: "ניו יורק",
    country_en: "USA",
    country_he: "ארצות הברית",
    flag: "🇺🇸",
    difficulty: 2,
    aliases: ["new york", "newyork", "new-york", "nyc", "ניו יורק", "ניו-יורק"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/NYC_Montage_2014_4_-_Jleon.jpg/1280px-NYC_Montage_2014_4_-_Jleon.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Manhattan_Bridge_NYC.jpg/1280px-Manhattan_Bridge_NYC.jpg",
    ],
  },
  {
    id: "tokyo",
    name_en: "Tokyo",
    name_he: "טוקיו",
    country_en: "Japan",
    country_he: "יפן",
    flag: "🇯🇵",
    difficulty: 3,
    aliases: ["tokyo", "טוקיו", "tokio"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/1280px-Skyscrapers_of_Shinjuku_2009_January.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Shibuya_Crossing_(50049607118).jpg/1280px-Shibuya_Crossing_(50049607118).jpg",
    ],
  },
  {
    id: "rome",
    name_en: "Rome",
    name_he: "רומא",
    country_en: "Italy",
    country_he: "איטליה",
    flag: "🇮🇹",
    difficulty: 2,
    aliases: ["rome", "roma", "רומא", "רומה"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg/1280px-Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg/1280px-Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg",
    ],
  },
  {
    id: "barcelona",
    name_en: "Barcelona",
    name_he: "ברצלונה",
    country_en: "Spain",
    country_he: "ספרד",
    flag: "🇪🇸",
    difficulty: 4,
    aliases: ["barcelona", "ברצלונה", "barca"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Sagrada_Familia_01.jpg/800px-Sagrada_Familia_01.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Vista_de_Barcelona_desde_Mirador_del_Alcalde.jpg/1280px-Vista_de_Barcelona_desde_Mirador_del_Alcalde.jpg",
    ],
  },
  {
    id: "amsterdam",
    name_en: "Amsterdam",
    name_he: "אמסטרדם",
    country_en: "Netherlands",
    country_he: "הולנד",
    flag: "🇳🇱",
    difficulty: 4,
    aliases: ["amsterdam", "אמסטרדם"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Amsterdam_Canals_-_July_2006.jpg/1280px-Amsterdam_Canals_-_July_2006.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Amsterdam_-_Houses_along_canal_-_0996.jpg/1280px-Amsterdam_-_Houses_along_canal_-_0996.jpg",
    ],
  },
  {
    id: "prague",
    name_en: "Prague",
    name_he: "פראג",
    country_en: "Czech Republic",
    country_he: "צ'כיה",
    flag: "🇨🇿",
    difficulty: 5,
    aliases: ["prague", "praha", "פראג"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Prague_06-2017_view_from_Prague_Castle03.jpg/1280px-Prague_06-2017_view_from_Prague_Castle03.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Prag_Karlsbruecke.jpg/1280px-Prag_Karlsbruecke.jpg",
    ],
  },
  {
    id: "istanbul",
    name_en: "Istanbul",
    name_he: "איסטנבול",
    country_en: "Turkey",
    country_he: "טורקיה",
    flag: "🇹🇷",
    difficulty: 4,
    aliases: ["istanbul", "איסטנבול", "istambul", "istanbool"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg/1280px-Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Galata_Tower_in_Istanbul_03.jpg/800px-Galata_Tower_in_Istanbul_03.jpg",
    ],
  },
  {
    id: "sydney",
    name_en: "Sydney",
    name_he: "סידני",
    country_en: "Australia",
    country_he: "אוסטרליה",
    flag: "🇦🇺",
    difficulty: 3,
    aliases: ["sydney", "סידני", "סידנה"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Sydney_Opera_House_Sails.jpg/1280px-Sydney_Opera_House_Sails.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Sydney_Harbour_Bridge_from_Circular_Quay.jpg/1280px-Sydney_Harbour_Bridge_from_Circular_Quay.jpg",
    ],
  },
  {
    id: "rio",
    name_en: "Rio de Janeiro",
    name_he: "ריו דה ז'ניירו",
    country_en: "Brazil",
    country_he: "ברזיל",
    flag: "🇧🇷",
    difficulty: 4,
    aliases: ["rio", "rio de janeiro", "ריו", "ריו דה ז'ניירו", "ריו דה זניירו"],
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Christ_the_Redeemer_-_Cristo_Redentor.jpg/800px-Christ_the_Redeemer_-_Cristo_Redentor.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Rio_de_Janeiro%2C_Brazil_%28Unsplash%29.jpg/1280px-Rio_de_Janeiro%2C_Brazil_%28Unsplash%29.jpg",
    ],
  },
];

export const normalizeForMatch = (s: string) =>
  s.toLowerCase().trim().replace(/[׳'"\-–—]/g, "").replace(/\s+/g, " ");

export const matchesCity = (input: string, city: CityData) => {
  const n = normalizeForMatch(input);
  if (!n) return false;
  if (normalizeForMatch(city.name_en) === n) return true;
  if (normalizeForMatch(city.name_he) === n) return true;
  return city.aliases.some((a) => normalizeForMatch(a) === n);
};

export const suggestCities = (input: string, max = 6): CityData[] => {
  const n = normalizeForMatch(input);
  if (!n) return [];
  return CITIES.filter((c) => {
    if (normalizeForMatch(c.name_en).includes(n)) return true;
    if (normalizeForMatch(c.name_he).includes(n)) return true;
    return c.aliases.some((a) => normalizeForMatch(a).includes(n));
  }).slice(0, max);
};
