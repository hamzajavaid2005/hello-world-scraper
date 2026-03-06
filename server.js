const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrapeCategory } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/scrape', async (req, res) => {
    try {
        let { url, urls, matchupData } = req.body;
        
        if (url && (!urls || urls.length === 0)) {
            urls = url.split('\n').map(u => u.trim()).filter(Boolean);
        }
        
        if (!urls || urls.length === 0) {
            return res.status(400).json({ error: 'At least one URL is required' });
        }

        console.log(`Starting scrape job for ${urls.length} URLs`);
        const result = await scrapeCategory(urls, matchupData);
        res.json(result);
        
    } catch (error) {
        console.error('Scrape API error:', error);
        res.status(500).json({ error: error.message || 'An error occurred during scraping' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
