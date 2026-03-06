const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function explore() {
    const url = 'https://www.budgetheating.com/1-5-ton-rheem-14-8-seer2-50k-btu-system-ra14ay18aj1na-r801t0503a14uhsnas-rcfy2414staamc/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Look for specifications or description tables
    const productView = $('.productView');
    fs.writeFileSync('product_deep.html', $.html(productView));
    console.log('Saved productView HTML to product_deep.html');
}

explore();
