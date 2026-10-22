/**
 * High-Precision Universal SEO Slug Generator
 * Handles English, Bengali (বাংলা), and mixed bilingual titles.
 * Converts Bengali keywords into clean, search-engine-friendly, human-readable English URLs.
 */

// Bengali numeral conversion
const BENGALI_DIGITS = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

// Common Bengali e-commerce, logistics, courier & SaaS terms mapping
const BENGALI_WORD_MAP = {
  "অনলাইন": "online",
  "অনলাইনে": "online",
  "শপ": "shop",
  "শপের": "shop",
  "দোকান": "store",
  "দোকানের": "store",
  "কুরিয়ার": "courier",
  "কুরিয়ারের": "courier",
  "রিটার্ন": "return",
  "রিটার্নস": "returns",
  "পার্সেল": "parcel",
  "পার্সেলের": "parcel",
  "ক্যানসেলেশন": "cancellation",
  "ক্যানসেল": "cancel",
  "কমানোর": "reduce",
  "কমানো": "reduce",
  "উপায়": "guide",
  "পদ্ধতি": "method",
  "কৌশল": "tactics",
  "টিপস": "tips",
  "অটোমেশন": "automation",
  "অটোমেটেড": "automated",
  "ই-কমার্স": "ecommerce",
  "ই-কমার্সে": "ecommerce",
  "ইকমার্স": "ecommerce",
  "স্টক": "stock",
  "স্টকের": "stock",
  "ইনভেন্টরি": "inventory",
  "ইনভেন্টরির": "inventory",
  "ওয়্যারহাউজ": "warehouse",
  "ওয়্যারহাউস": "warehouse",
  "বারকোড": "barcode",
  "স্ক্যানার": "scanner",
  "স্ক্যান": "scan",
  "স্ক্যানিং": "scanning",
  "মোবাইল": "mobile",
  "ক্যামেরা": "camera",
  "ক্যাশ": "cash",
  "ডেলিভারি": "delivery",
  "হিসাব": "accounting",
  "লাভ": "profit",
  "ক্ষতি": "loss",
  "খরচ": "cost",
  "সেটআপ": "setup",
  "গাইডলাইন": "guideline",
  "গাইড": "guide",
  "স্টেডফাস্ট": "steadfast",
  "পাঠাও": "pathao",
  "রেডএক্স": "redx",
  "পেপারফ্লাই": "paperfly",
  "ব্যবসা": "business",
  "বিজনেস": "business",
  "সফটওয়্যার": "software",
  "অ্যাপ": "app",
  "অ্যাকাউন্ট": "account",
  "ফ্রি": "free",
  "ট্র্যাকিং": "tracking",
  "ট্র্যাক": "track",
  "সফল": "success",
  "সফলতার": "success",
  "নিয়ম": "rules",
  "ফর্মুলা": "formula",
  "সূত্র": "formula",
  "সেফটি": "safety",
  "বাল্ক": "bulk",
  "অর্ডার": "order",
  "অর্ডারের": "orders",
  "লেবেল": "label",
  "থার্মাল": "thermal",
  "প্রিন্ট": "print",
  "প্রিন্টার": "printer",
  "প্যাকিং": "packing",
  "প্যাক": "pack",
  "রিকনসিলিয়েশন": "reconciliation",
  "পেমেন্ট": "payment",
  "বুকিং": "booking",
  "বুক": "book",
  "মার্কেট": "market",
  "মার্কেটিং": "marketing",
  "গ্রাহক": "customer",
  "কাস্টমার": "customer",
  "হোয়াটসঅ্যাপ": "whatsapp",
  "ফেসবুক": "facebook",
  "পেজ": "page",
  "শুরু": "start",
  "সহজ": "easy",
  "সেরা": "best",
  "সম্পূর্ণ": "complete",
  "কমপ্লিট": "complete",
  "স্ট্র্যাটেজি": "strategy",
  "গ্রোথ": "growth",
  "সেলস": "sales",
  "বিক্রি": "sales",
  "রিঅর্ডার": "reorder",
  "পয়েন্ট": "point",
};

// Common Bengali stopwords to skip in URL slugs
const BENGALI_STOPWORDS = new Set([
  "ও", "এবং", "বা", "কিন্তু", "থেকে", "দিয়ে", "দিয়া", "হওয়ার", "হতে", "করে",
  "করা", "জন্য", "নিয়ে", "একটি", "কয়েকটি", "এর", "তে", "কে", "এ", "র", "সহ",
  "হবে", "আছে", "না", "কি", "কী", "কেন", "কিভাবে", "যেভাবে", "সব", "এই",
]);

// Basic Bengali to Latin phonetic transliteration map for unmapped words
const BENGALI_PHONETIC = {
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "ee", "উ": "u", "ঊ": "oo", "ঋ": "ri",
  "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
  "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
  "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
  "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
  "প": "p", "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m",
  "য": "z", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h",
  "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t",
  "া": "a", "ি": "i", "ী": "ee", "ু": "u", "ূ": "oo", "ৃ": "ri",
  "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  "্": "", "ং": "ng", "ঃ": "", "ঁ": "",
};

function transliterateBengaliWord(word) {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    result += BENGALI_PHONETIC[char] || char;
  }
  return result;
}

/**
 * Generates an SEO-optimized Latin slug from any English, Bengali, or mixed title.
 *
 * @param {string} title - The post or guide title
 * @param {string} [fallbackKeyword] - Optional focus keyword to enrich the slug
 * @returns {string} Clean, hyphenated, URL-safe slug
 */
export function generateSmartSlug(title = "", fallbackKeyword = "") {
  if (!title && !fallbackKeyword) {
    return `guide-${Date.now().toString().slice(-4)}`;
  }

  const raw = String(title || fallbackKeyword).trim();

  // Convert Bengali numerals to Latin digits
  let normalized = "";
  for (const char of raw) {
    normalized += BENGALI_DIGITS[char] !== undefined ? BENGALI_DIGITS[char] : char;
  }

  // Split into tokens (handling punctuation like colons, parentheses, commas)
  const tokens = normalized
    .replace(/[:;,!?"'()\[\]{}|/\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const slugWords = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Check if English word or number
    if (/^[a-z0-9_-]+$/i.test(lower)) {
      if (lower.length > 1 || /^\d+$/.test(lower)) {
        slugWords.push(lower);
      }
      continue;
    }

    // Check if Bengali stopword
    if (BENGALI_STOPWORDS.has(lower)) {
      continue;
    }

    // Check semantic dictionary match
    if (BENGALI_WORD_MAP[lower]) {
      slugWords.push(BENGALI_WORD_MAP[lower]);
      continue;
    }

    // Check partial root match (strip common endings like ের, ার, ে, ইত্যাদ)
    const root = lower.replace(/(ের|ার|ে|য়|কে|তে|র|দের)$/u, "");
    if (root && BENGALI_WORD_MAP[root]) {
      slugWords.push(BENGALI_WORD_MAP[root]);
      continue;
    }

    // Transliterate phonetically
    const phon = transliterateBengaliWord(lower).replace(/[^a-z0-9]/gi, "");
    if (phon && phon.length >= 2) {
      slugWords.push(phon.toLowerCase());
    }
  }

  // Deduplicate consecutive identical words
  const deduplicated = [];
  for (let i = 0; i < slugWords.length; i++) {
    if (i === 0 || slugWords[i] !== slugWords[i - 1]) {
      deduplicated.push(slugWords[i]);
    }
  }

  // Limit slug length to optimal 6-9 keyword tokens for Google SERP
  const selectedWords = deduplicated.slice(0, 8);
  let finalSlug = selectedWords.join("-").replace(/^-+|-+$/g, "");

  // If still empty (e.g. only symbols entered), fallback safely
  if (!finalSlug || finalSlug.length < 2) {
    finalSlug = `guide-${Date.now().toString().slice(-4)}`;
  }

  return finalSlug;
}
