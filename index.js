const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const { scrapeCategory } = require('./scraper');

const START_URL = 'https://www.budgetheating.com/Air-Conditioner-Gas-Furnace-Cased-Coil-s/121.htm?_bc_fsnf=1&brand=47';

const csvWriter = createObjectCsvWriter({
    path: 'products.csv',
    header: [
        { id: 'title', title: 'Product Title' },
        { id: 'url', title: 'Product URL' },
        { id: 'listPrice', title: 'List Price' },
        { id: 'ourPrice', title: 'Our Price' },
        { id: 'image', title: 'Image URL' }
    ]
});

const matchedCsvWriter = createObjectCsvWriter({
    path: 'matched_products.csv',
    header: [
        { id: 'name', title: 'name' },
        { id: 'price', title: 'price' },
        { id: 'description', title: 'description' },
        { id: 'stock', title: 'stock' },
        { id: 'category', title: 'category' },
        { id: 'brand', title: 'brand' },
        { id: 'active', title: 'active' },
        { id: 'listPrice', title: 'listPrice' },
        { id: 'isFreeShipping', title: 'isFreeShipping' },
        { id: 'shippingFee', title: 'shippingFee' },
        { id: 'images', title: 'images' },
        { id: 'features', title: 'features' },
        { id: 'dimensions', title: 'dimensions' },
        { id: 'specs', title: 'specs' },
        { id: 'services', title: 'services' }
    ]
});

async function run() {
    console.log('Starting scraper...');
    let matchupDataString = '';
    if (fs.existsSync('matchups.txt')) {
        matchupDataString = fs.readFileSync('matchups.txt', 'utf-8');
        console.log(`Loaded matchups configurations from matchups.txt.`);
    }

    try {
        const { allProducts, matchedProducts, matchupResultsCsv, pagesScraped } = await scrapeCategory([START_URL], matchupDataString);

        console.log(`\nFinished scraping! Collected ${allProducts.length} total products across ${pagesScraped} pages.`);
        
        if (allProducts.length > 0) {
            await csvWriter.writeRecords(allProducts);
            console.log('✅ All data saved successfully to products.csv');
        }

        if (matchedProducts.length > 0) {
            await matchedCsvWriter.writeRecords(matchedProducts);
            console.log(`✅ ${matchedProducts.length} matched products saved successfully to matched_products.csv`);
        } else {
            console.log('No matched products found.');
        }

        if (matchupResultsCsv && matchupResultsCsv.length > 0) {
            fs.writeFileSync('matchup_results.csv', matchupResultsCsv.join('\n'));
            console.log(`✅ Matchup status results saved successfully to matchup_results.csv`);
        }

    } catch (e) {
        console.error('Error running scraper:', e);
    }
}

run();
