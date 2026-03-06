const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeProductDetails(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerio.load(data);

    // 1. Extract Description
    let description = $("#tab-description").text().replace(/\s+/g, " ").trim();
    // Fallback or truncate if it's too massive, but user wants it
    if (!description) description = "";

    // 2. Extract Specifications
    const specsData = [];
    $(".productView-info li").each((_, el) => {
      const name = $(el)
        .find(".productView-info-name")
        .text()
        .replace(":", "")
        .trim();
      const value = $(el).find(".productView-info-value").text().trim();
      if (
        name &&
        value &&
        name !== "Availability" &&
        name !== "Shipping" &&
        name !== "SKU"
      ) {
        specsData.push(`${name}:${value}`);
      }
    });
    const specs = specsData.join("|");

    // 3. Extract Manufacturer/Brand
    let brand = "";
    $(".productView-info-name").each((_, el) => {
      if ($(el).text().includes("Manufacturer")) {
        brand = $(el).parent().find("a").text().trim();
      }
    });
    if (!brand) {
      const mfgMatch = data.match(
        /Manufacturer:\s*<a[^>]*><span[^>]*>(.*?)<\/span>/i,
      );
      if (mfgMatch) brand = mfgMatch[1].trim();
    }

    return { description, specs, brand };
  } catch (e) {
    console.error("Error fetching product details for URL:", url, e.message);
    return { description: "", specs: "", brand: "BudgetHeating" };
  }
}

function parseMatchups(tsvData) {
  const matchups = [];
  if (!tsvData) return matchups;

  const lines = tsvData.split("\n");
  for (let line of lines) {
    if (
      !line.trim() ||
      line.startsWith("AHRI") ||
      line.startsWith("14 SEER") ||
      line.includes("Table")
    )
      continue;

    const parts = line.split("\t");
    if (parts.length >= 4) {
      matchups.push({
        originalLine: line.trim(),
        outdoor: parts[1].trim(),
        coil: parts[2].trim(),
        furnace: parts[3].trim(),
        isMatched: false,
      });
    }
  }
  return matchups;
}

function extractPrice(text) {
  if (!text) return "";
  return text.replace(/[^0-9.]/g, ""); // Extract numeric price, keeping decimal
}

function attachBaseUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return "https://www.budgetheating.com" + url;
  return "https://www.budgetheating.com/" + url;
}

async function scrapeCategory(urls = [], matchupDataString = "") {
  const matchups = parseMatchups(matchupDataString);
  const allProducts = [];
  const matchedProducts = [];
  let pagesScraped = 0;

  for (let initialUrl of urls) {
    if (!initialUrl.trim()) continue;

    let currentUrl = initialUrl.trim();
    console.log(`Starting scrape for URL block: ${currentUrl}`);

    while (currentUrl) {
      try {
        const { data } = await axios.get(currentUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const $ = cheerio.load(data);
        pagesScraped++;

        const productLinksToDeepScrape = [];

        $(".productGrid .product").each((index, element) => {
          const el = $(element);
          const aTag = el.find("h3 a");
          const title = aTag.text().trim();
          const rawUrl =
            aTag.attr("href") || el.find(".card-figure__link").attr("href");
          const url = attachBaseUrl(rawUrl);

          let image =
            el.find("img.lazyload").attr("data-srcset") ||
            el.find("img.lazyload").attr("data-src") ||
            el.find("img").attr("src");
          if (image && image.includes("data:image")) {
            image = el.find("img.lazyload").attr("data-srcset");
          }
          if (image && image.includes(",")) {
            image = image.split(",")[0].trim().split(" ")[0];
          }
          if (!image) image = "";

          let listPrice =
            el
              .find(".price-section--withoutTax")
              .first()
              .find(".price")
              .first()
              .text()
              .trim() || "";
          let ourPrice =
            el
              .find("span[data-product-non-sale-price-without-tax]")
              .text()
              .trim() || el.find(".price").last().text().trim();

          ourPrice = extractPrice(ourPrice);
          listPrice = extractPrice(listPrice) || ourPrice;

          const productData = {
            title,
            url,
            image,
            listPrice,
            ourPrice,
          };

          allProducts.push(productData);

          if (matchups.length > 0) {
            const foundMatch = matchups.find((match) => {
              if (!match.outdoor || !match.coil || !match.furnace) return false;
              return (
                title.includes(match.outdoor) &&
                title.includes(match.coil) &&
                title.includes(match.furnace)
              );
            });

            if (foundMatch) {
              foundMatch.isMatched = true;
              foundMatch.matchedProductData = productData;

              productData.outdoor = foundMatch.outdoor;
              productData.coil = foundMatch.coil;
              productData.furnace = foundMatch.furnace;
              productLinksToDeepScrape.push(productData);
            }
          }
        });

        // Deep Scrape matched products simultaneously
        const deepScrapePromises = productLinksToDeepScrape.map(async (p) => {
          console.log(
            `Deep scraping matched product: ${p.title.substring(0, 30)}...`,
          );
          const details = await scrapeProductDetails(p.url);

          // Format explicitly as requested by the user
          matchedProducts.push({
            name: p.title.replace(/"/g, '""'), // safe CSV quotes handled by csv-writer usually, but mapping it safely here
            price: p.ourPrice,
            description: details.description,
            stock: 150,
            category: "Air Conditioners",
            brand: details.brand || "BudgetHeating",
            active: "true",
            listPrice: p.listPrice,
            isFreeShipping: "true",
            shippingFee: "",
            images: "",
            features: "Energy Star:Yes|Remote Control:Included|Timer:24-Hour",
            dimensions: "Width:24in|Height:18in|Depth:22in|Weight:75lbs",
            specs: details.specs,
            services:
              "Installation[Standard=149,Window Pro=199];Warranty Extension[1 Year=49,2 Years=89]",
          });
        });

        await Promise.all(deepScrapePromises);

        const nextLink = $(".pagination .pagination-item--next a").attr("href");
        currentUrl = nextLink ? attachBaseUrl(nextLink) : null;
      } catch (error) {
        console.error(`Error scraping ${currentUrl}:`, error.message);
        currentUrl = null;
      }
    }
  }

  const matchupResultsCsv = matchups.map((m) => {
    const parts = m.originalLine.split("\t");

    // Ensure consistent 10 base columns before appending new data
    while (parts.length < 10) {
      parts.push("");
    }

    // Add Match Status
    parts.push(m.isMatched ? "✓" : "✗");

    // Add Product Data if matched
    if (m.isMatched && m.matchedProductData) {
      parts.push(
        m.matchedProductData.title,
        m.matchedProductData.ourPrice,
        m.matchedProductData.url,
      );
    } else {
      parts.push("", "", "");
    }

    return parts
      .map((val) => {
        val = val ? String(val) : "";
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",");
  });

  matchupResultsCsv.unshift(
    "AHRI,Outdoor,Coil,Furnace,Capacity,EER2,SEER2,Price,Added Done,Notes,Match Status,Found Product Title,Found Product Price,Found Product URL",
  );

  return {
    allProducts,
    matchedProducts,
    matchupResultsCsv,
    pagesScraped,
  };
}

module.exports = {
  scrapeCategory,
};
