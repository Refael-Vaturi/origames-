// City data for CityFind game.
// Guessing is now map-click/distance based (no text matching needed), so
// each city just needs accurate coordinates plus display info for hints.
// "images" is an optional curated fallback shown only when Street View has
// no coverage near a city; cities without one just show a neutral overlay.

export interface CityData {
  id: string;
  name_en: string;
  name_he: string;
  country_en: string;
  country_he: string;
  flag: string;
  difficulty: number; // 1..20, roughly how recognizable/famous the spot is
  lat: number;
  lng: number;
  images?: string[];
}

export const CITIES: CityData[] = [
  // ─── Easier / more recognizable (kept from the original set) ───
  {
    id: "tel-aviv", name_en: "Tel Aviv", name_he: "תל אביב", country_en: "Israel", country_he: "ישראל",
    flag: "🇮🇱", difficulty: 3, lat: 32.0809, lng: 34.7806,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Tel_Aviv_Skyline.jpg/1280px-Tel_Aviv_Skyline.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Tel_Aviv_Beach_Promenade.jpg/1280px-Tel_Aviv_Beach_Promenade.jpg",
    ],
  },
  { id: "paris", name_en: "Paris", name_he: "פריז", country_en: "France", country_he: "צרפת", flag: "🇫🇷", difficulty: 1, lat: 48.8584, lng: 2.2945 },
  { id: "london", name_en: "London", name_he: "לונדון", country_en: "United Kingdom", country_he: "בריטניה", flag: "🇬🇧", difficulty: 1, lat: 51.5007, lng: -0.1246 },
  { id: "new-york", name_en: "New York", name_he: "ניו יורק", country_en: "USA", country_he: "ארצות הברית", flag: "🇺🇸", difficulty: 2, lat: 40.758, lng: -73.9855 },
  { id: "tokyo", name_en: "Tokyo", name_he: "טוקיו", country_en: "Japan", country_he: "יפן", flag: "🇯🇵", difficulty: 3, lat: 35.6595, lng: 139.7004 },
  { id: "rome", name_en: "Rome", name_he: "רומא", country_en: "Italy", country_he: "איטליה", flag: "🇮🇹", difficulty: 2, lat: 41.8902, lng: 12.4922 },
  { id: "barcelona", name_en: "Barcelona", name_he: "ברצלונה", country_en: "Spain", country_he: "ספרד", flag: "🇪🇸", difficulty: 4, lat: 41.4036, lng: 2.1744 },
  { id: "amsterdam", name_en: "Amsterdam", name_he: "אמסטרדם", country_en: "Netherlands", country_he: "הולנד", flag: "🇳🇱", difficulty: 4, lat: 52.3676, lng: 4.9041 },
  { id: "prague", name_en: "Prague", name_he: "פראג", country_en: "Czech Republic", country_he: "צ'כיה", flag: "🇨🇿", difficulty: 5, lat: 50.0875, lng: 14.4213 },
  { id: "istanbul", name_en: "Istanbul", name_he: "איסטנבול", country_en: "Turkey", country_he: "טורקיה", flag: "🇹🇷", difficulty: 4, lat: 41.0086, lng: 28.9802 },
  { id: "sydney", name_en: "Sydney", name_he: "סידני", country_en: "Australia", country_he: "אוסטרליה", flag: "🇦🇺", difficulty: 3, lat: -33.8568, lng: 151.2153 },
  { id: "rio", name_en: "Rio de Janeiro", name_he: "ריו דה ז'ניירו", country_en: "Brazil", country_he: "ברזיל", flag: "🇧🇷", difficulty: 4, lat: -22.9519, lng: -43.2105 },

  // ─── Harder / less obvious, spread across the world ───
  { id: "porto", name_en: "Porto", name_he: "פורטו", country_en: "Portugal", country_he: "פורטוגל", flag: "🇵🇹", difficulty: 8, lat: 41.1579, lng: -8.6291 },
  { id: "krakow", name_en: "Krakow", name_he: "קרקוב", country_en: "Poland", country_he: "פולין", flag: "🇵🇱", difficulty: 7, lat: 50.0619, lng: 19.9368 },
  { id: "bruges", name_en: "Bruges", name_he: "בריז'", country_en: "Belgium", country_he: "בלגיה", flag: "🇧🇪", difficulty: 9, lat: 51.2093, lng: 3.2247 },
  { id: "salzburg", name_en: "Salzburg", name_he: "זלצבורג", country_en: "Austria", country_he: "אוסטריה", flag: "🇦🇹", difficulty: 8, lat: 47.8095, lng: 13.055 },
  { id: "bergen", name_en: "Bergen", name_he: "ברגן", country_en: "Norway", country_he: "נורווגיה", flag: "🇳🇴", difficulty: 10, lat: 60.3913, lng: 5.3221 },
  { id: "reykjavik", name_en: "Reykjavik", name_he: "רייקיאוויק", country_en: "Iceland", country_he: "איסלנד", flag: "🇮🇸", difficulty: 9, lat: 64.1466, lng: -21.9426 },
  { id: "dubrovnik", name_en: "Dubrovnik", name_he: "דוברובניק", country_en: "Croatia", country_he: "קרואטיה", flag: "🇭🇷", difficulty: 9, lat: 42.6507, lng: 18.0944 },
  { id: "ljubljana", name_en: "Ljubljana", name_he: "ליובליאנה", country_en: "Slovenia", country_he: "סלובניה", flag: "🇸🇮", difficulty: 12, lat: 46.0569, lng: 14.5058 },
  { id: "bratislava", name_en: "Bratislava", name_he: "ברטיסלבה", country_en: "Slovakia", country_he: "סלובקיה", flag: "🇸🇰", difficulty: 12, lat: 48.1486, lng: 17.1077 },
  { id: "valletta", name_en: "Valletta", name_he: "ואלטה", country_en: "Malta", country_he: "מלטה", flag: "🇲🇹", difficulty: 13, lat: 35.8989, lng: 14.5146 },
  { id: "edinburgh", name_en: "Edinburgh", name_he: "אדינבורו", country_en: "United Kingdom", country_he: "בריטניה", flag: "🇬🇧", difficulty: 6, lat: 55.9533, lng: -3.1883 },
  { id: "seville", name_en: "Seville", name_he: "סביליה", country_en: "Spain", country_he: "ספרד", flag: "🇪🇸", difficulty: 8, lat: 37.3891, lng: -5.9845 },
  { id: "florence", name_en: "Florence", name_he: "פירנצה", country_en: "Italy", country_he: "איטליה", flag: "🇮🇹", difficulty: 7, lat: 43.7696, lng: 11.2558 },
  { id: "bordeaux", name_en: "Bordeaux", name_he: "בורדו", country_en: "France", country_he: "צרפת", flag: "🇫🇷", difficulty: 10, lat: 44.8378, lng: -0.5792 },
  { id: "gothenburg", name_en: "Gothenburg", name_he: "גטבורג", country_en: "Sweden", country_he: "שוודיה", flag: "🇸🇪", difficulty: 12, lat: 57.7089, lng: 11.9746 },
  { id: "helsinki", name_en: "Helsinki", name_he: "הלסינקי", country_en: "Finland", country_he: "פינלנד", flag: "🇫🇮", difficulty: 9, lat: 60.1699, lng: 24.9384 },
  { id: "vilnius", name_en: "Vilnius", name_he: "וילנה", country_en: "Lithuania", country_he: "ליטא", flag: "🇱🇹", difficulty: 13, lat: 54.6872, lng: 25.2797 },
  { id: "zagreb", name_en: "Zagreb", name_he: "זאגרב", country_en: "Croatia", country_he: "קרואטיה", flag: "🇭🇷", difficulty: 13, lat: 45.815, lng: 15.9819 },

  { id: "quebec-city", name_en: "Quebec City", name_he: "קוויבק סיטי", country_en: "Canada", country_he: "קנדה", flag: "🇨🇦", difficulty: 9, lat: 46.8139, lng: -71.208 },
  { id: "new-orleans", name_en: "New Orleans", name_he: "ניו אורלינס", country_en: "USA", country_he: "ארצות הברית", flag: "🇺🇸", difficulty: 6, lat: 29.9511, lng: -90.0715 },
  { id: "san-francisco", name_en: "San Francisco", name_he: "סן פרנסיסקו", country_en: "USA", country_he: "ארצות הברית", flag: "🇺🇸", difficulty: 5, lat: 37.7749, lng: -122.4194 },
  { id: "vancouver", name_en: "Vancouver", name_he: "ונקובר", country_en: "Canada", country_he: "קנדה", flag: "🇨🇦", difficulty: 6, lat: 49.2827, lng: -123.1207 },
  { id: "guadalajara", name_en: "Guadalajara", name_he: "גוואדלחרה", country_en: "Mexico", country_he: "מקסיקו", flag: "🇲🇽", difficulty: 11, lat: 20.6597, lng: -103.3496 },
  { id: "charleston", name_en: "Charleston", name_he: "צ'רלסטון", country_en: "USA", country_he: "ארצות הברית", flag: "🇺🇸", difficulty: 12, lat: 32.7765, lng: -79.9311 },

  { id: "buenos-aires", name_en: "Buenos Aires", name_he: "בואנוס איירס", country_en: "Argentina", country_he: "ארגנטינה", flag: "🇦🇷", difficulty: 6, lat: -34.6037, lng: -58.3816 },
  { id: "cusco", name_en: "Cusco", name_he: "קוסקו", country_en: "Peru", country_he: "פרו", flag: "🇵🇪", difficulty: 10, lat: -13.532, lng: -71.9675 },
  { id: "valparaiso", name_en: "Valparaiso", name_he: "ולפרייסו", country_en: "Chile", country_he: "צ'ילה", flag: "🇨🇱", difficulty: 12, lat: -33.0472, lng: -71.6127 },
  { id: "cartagena", name_en: "Cartagena", name_he: "קרטחנה", country_en: "Colombia", country_he: "קולומביה", flag: "🇨🇴", difficulty: 11, lat: 10.391, lng: -75.4794 },
  { id: "montevideo", name_en: "Montevideo", name_he: "מונטווידאו", country_en: "Uruguay", country_he: "אורוגוואי", flag: "🇺🇾", difficulty: 12, lat: -34.9011, lng: -56.1645 },

  { id: "cape-town", name_en: "Cape Town", name_he: "קייפטאון", country_en: "South Africa", country_he: "דרום אפריקה", flag: "🇿🇦", difficulty: 8, lat: -33.9249, lng: 18.4241 },
  { id: "marrakesh", name_en: "Marrakesh", name_he: "מרקש", country_en: "Morocco", country_he: "מרוקו", flag: "🇲🇦", difficulty: 9, lat: 31.6295, lng: -7.9811 },
  { id: "nairobi", name_en: "Nairobi", name_he: "ניירובי", country_en: "Kenya", country_he: "קניה", flag: "🇰🇪", difficulty: 13, lat: -1.2921, lng: 36.8219 },

  { id: "kyoto", name_en: "Kyoto", name_he: "קיוטו", country_en: "Japan", country_he: "יפן", flag: "🇯🇵", difficulty: 8, lat: 35.0116, lng: 135.7681 },
  { id: "seoul", name_en: "Seoul", name_he: "סיאול", country_en: "South Korea", country_he: "דרום קוריאה", flag: "🇰🇷", difficulty: 9, lat: 37.5665, lng: 126.978 },
  { id: "taipei", name_en: "Taipei", name_he: "טייפיי", country_en: "Taiwan", country_he: "טייוואן", flag: "🇹🇼", difficulty: 10, lat: 25.033, lng: 121.5654 },
  { id: "singapore", name_en: "Singapore", name_he: "סינגפור", country_en: "Singapore", country_he: "סינגפור", flag: "🇸🇬", difficulty: 9, lat: 1.3521, lng: 103.8198 },
  { id: "bangkok", name_en: "Bangkok", name_he: "בנגקוק", country_en: "Thailand", country_he: "תאילנד", flag: "🇹🇭", difficulty: 9, lat: 13.7563, lng: 100.5018 },
  { id: "kuala-lumpur", name_en: "Kuala Lumpur", name_he: "קואלה לומפור", country_en: "Malaysia", country_he: "מלזיה", flag: "🇲🇾", difficulty: 11, lat: 3.139, lng: 101.6869 },
  { id: "hanoi", name_en: "Hanoi", name_he: "האנוי", country_en: "Vietnam", country_he: "וייטנאם", flag: "🇻🇳", difficulty: 12, lat: 21.0285, lng: 105.8542 },
  { id: "jaipur", name_en: "Jaipur", name_he: "ג'איפור", country_en: "India", country_he: "הודו", flag: "🇮🇳", difficulty: 12, lat: 26.9124, lng: 75.7873 },
  { id: "tbilisi", name_en: "Tbilisi", name_he: "טביליסי", country_en: "Georgia", country_he: "גאורגיה", flag: "🇬🇪", difficulty: 14, lat: 41.7151, lng: 44.8271 },

  { id: "melbourne", name_en: "Melbourne", name_he: "מלבורן", country_en: "Australia", country_he: "אוסטרליה", flag: "🇦🇺", difficulty: 6, lat: -37.8136, lng: 144.9631 },
  { id: "auckland", name_en: "Auckland", name_he: "אוקלנד", country_en: "New Zealand", country_he: "ניו זילנד", flag: "🇳🇿", difficulty: 9, lat: -36.8485, lng: 174.7633 },
  { id: "queenstown", name_en: "Queenstown", name_he: "קווינסטאון", country_en: "New Zealand", country_he: "ניו זילנד", flag: "🇳🇿", difficulty: 12, lat: -45.0312, lng: 168.6626 },
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** GeoGuessr-style exponential decay: full marks up close, tapering off with distance. */
export function scoreForDistance(distanceKm: number): number {
  if (distanceKm <= 5) return 5000;
  return Math.max(0, Math.round(5000 * Math.exp(-distanceKm / 1500)));
}
