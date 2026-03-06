document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scrapeForm');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');
    const btnText = document.querySelector('.btn-text');
    const statusMessage = document.getElementById('statusMessage');
    const resultsSection = document.getElementById('resultsSection');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportStatusCsvBtn = document.getElementById('exportStatusCsvBtn');
    const exportAllCsvBtn = document.getElementById('exportAllCsvBtn');

    let currentMatchedProducts = [];
    let currentMatchupResultsCsv = [];
    let currentAllProducts = [];

    // Default TSV data if empty
    const defaultTsv = `14 SEER2 A/C W/ 80% Upflow/Horizontal Furnace										
AHRI\tOutdoor\tCoil\tFurnace\tCapacity\tEER2\tSEER2\tPrice\tAdded Done		
215399965\tRA14AY18AJ1NA\tRCFY2414STAAMC\tR801T0503A14UHSNAS\t17100\t11.7\t14.8\t$2,268.39\tTRUE		
216376265\tRA14AY24BJ1NA\tRCFY2414STAAMC\tR801T0503A14UHSNAS\t22800\t12\t15.2\t$2,518.30\tTRUE		
216375887\tRA14AY24BJ1NA\tRCFY2417STANMC\tR801T0754A17UHSNAS\t22800\t11.7\t14.8\t$2,587.98\tFALSE\tmatchup not available	
215226839\tRA14AY30AJ1NA\tRCFY3617STANMC\tR801T0754A17UHSNAS\t28400\t11.7\t14.3\t$2,623.42\tTRUE		
215230125\tRA14AY36AJ1NA\tRCFY3617STANMC\tR801T0754A17UHSNAS\t33800\t11.7\t14.8\t$2,824.90\tTRUE		
215230299\tRA14AY36AJ1NA\tRCFY3621STANMC\tR801T0754A21UHSNAS\t34000\t12\t15.2\t$2,990.03\tFALSE\tmatchup not available	
215230393\tRA14AY36AJ1NA\tRCFY3621STANMC\tR801T1005A21UHSNAS\t34000\t11.7\t14.8\t$2,904.74\tTRUE		
215233749\tRA14AY42AJ1NA\tRCFY4821STANMC\tR801T0754A21UHSNAS\t39000\t12\t15.2\t$3,246.76\tTRUE		
215234306\tRA14AY42AJ1NA\tRCFY4821STANMC\tR801T1005A21UHSNAS\t39500\t12\t15.2\t$3,161.47\tTRUE		
215240755\tRA14AY48AJ1NA\tRCFY4821STANMC\tR801T1005A21UHSNAS\t45500\t11.2\t13.8\t$3,408.37\tTRUE		
215240780\tRA14AY48AJ1NA\tRCFY4824STANMC\tR801T1255A24UHSNAS\t45500\t11.7\t14.8\t$3,558.05\tFALSE\tmatchup not available	
215232631\tRA14AY60AJ1NA\tRCFY6021STAAMC\tR801T1005A21UHSNAS\t54500\t11.2\t13.8\t$3,917.29\tTRUE		
215232658\tRA14AY60AJ1NA\tRCFY6024STANMC\tR801T1255A24UHSNAS\t56000\t11.7\t14.8\t$4,060.05\tTRUE`;

    const matchupTextarea = document.getElementById('matchupData');
    matchupTextarea.value = defaultTsv;

    // Tabs logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const urlsText = document.getElementById('url').value;
        const urls = urlsText.split('\n').map(u => u.trim()).filter(Boolean);
        const matchupData = document.getElementById('matchupData').value;

        // UI wait state
        submitBtn.disabled = true;
        btnText.textContent = 'Scraping...';
        spinner.classList.remove('hidden');
        statusMessage.classList.add('hidden');
        resultsSection.classList.add('hidden');

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, matchupData })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to scrape.');
            }

            currentMatchedProducts = result.matchedProducts || [];
            currentMatchupResultsCsv = result.matchupResultsCsv || [];
            currentAllProducts = result.allProducts || [];

            renderResults(result);

            statusMessage.textContent = `Success! Scraped ${result.allProducts.length} products across ${result.pagesScraped} pages, found ${result.matchedProducts.length} matches.`;
            statusMessage.className = 'status-message success';
            statusMessage.classList.remove('hidden');
            resultsSection.classList.remove('hidden');

            // Switch to matched products tab if any exist
            if (result.matchedProducts.length > 0) {
                tabBtns[0].click();
                exportCsvBtn.classList.remove('hidden');
            } else {
                tabBtns[1].click();
                exportCsvBtn.classList.add('hidden');
            }
            
            if (currentMatchupResultsCsv.length > 0) {
                exportStatusCsvBtn.classList.remove('hidden');
            } else {
                exportStatusCsvBtn.classList.add('hidden');
            }
            
            if (currentAllProducts.length > 0) {
                exportAllCsvBtn.classList.remove('hidden');
            } else {
                exportAllCsvBtn.classList.add('hidden');
            }

        } catch (error) {
            statusMessage.textContent = error.message;
            statusMessage.className = 'status-message error';
            statusMessage.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'Start Scraping';
            spinner.classList.add('hidden');
        }
    });

    function renderResults({ allProducts, matchedProducts }) {
        document.getElementById('allCount').textContent = allProducts.length;
        document.getElementById('matchedCount').textContent = matchedProducts.length;

        const allGrid = document.getElementById('allGrid');
        const matchedGrid = document.getElementById('matchedGrid');

        allGrid.innerHTML = allProducts.map(p => createCard(p)).join('');
        matchedGrid.innerHTML = matchedProducts.map(p => createCard(p, true)).join('');
    }

    function createCard(product, isMatched = false) {
        let matchChips = '';
        if (isMatched && product.specs) {
            matchChips = `
                <div class="match-chips">
                    <span class="chip" title="${product.specs}">View Extracted Specs</span>
                    <span class="chip">Stock: ${product.stock}</span>
                </div>
            `;
        }

        return `
            <div class="card">
                <img src="${product.image || product.images || 'https://via.placeholder.com/300?text=No+Image'}" alt="${product.title || product.name}" class="card-img" onerror="this.src='https://via.placeholder.com/300?text=Error'">
                <div class="card-content">
                    <a href="${product.url || '#'}" target="_blank" class="card-title">${product.title || product.name}</a>
                    <div class="card-price-container">
                        ${product.listPrice ? `<div class="list-price">List: ${product.listPrice}</div>` : ''}
                        <div class="our-price">${product.ourPrice || product.price}</div>
                    </div>
                    ${matchChips}
                </div>
            </div>
        `;
    }

    // CSV Export Logic
    exportCsvBtn.addEventListener('click', () => {
        if (!currentMatchedProducts || currentMatchedProducts.length === 0) return;

        const headers = [
            'name', 'price', 'description', 'stock', 'category', 'brand', 
            'active', 'listPrice', 'isFreeShipping', 'shippingFee', 'images', 
            'features', 'dimensions', 'specs', 'services'
        ];

        let csvContent = headers.join(',') + '\n';

        currentMatchedProducts.forEach(product => {
            const row = headers.map(header => {
                let val = product[header] || '';
                // Escape quotes for CSV
                val = String(val).replace(/"/g, '""');
                // Wrap in quotes if it contains comma, double quote, or newline
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val}"`;
                }
                return val;
            });
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'matched_products_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // CSV Matchup Status Export Logic
    exportStatusCsvBtn.addEventListener('click', () => {
        if (!currentMatchupResultsCsv || currentMatchupResultsCsv.length === 0) return;

        // Since currentMatchupResultsCsv is already an array of formatted CSV lines without headers
        // we might want to attach a simple header if we don't know the exact ones.
        // Assuming the last column is the match status:
        const firstLineCols = currentMatchupResultsCsv[0].split(',').length;
        const generatedHeaders = Array.from({length: firstLineCols - 1}, (_, i) => `Column${i+1}`);
        generatedHeaders.push('Status');

        let csvContent = generatedHeaders.join(',') + '\n';
        csvContent += currentMatchupResultsCsv.join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'matchup_status_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // CSV All Products Export Logic
    exportAllCsvBtn.addEventListener('click', () => {
        if (!currentAllProducts || currentAllProducts.length === 0) return;

        const headers = ['title', 'url', 'listPrice', 'ourPrice', 'image'];

        let csvContent = headers.join(',') + '\n';

        currentAllProducts.forEach(product => {
            const row = headers.map(header => {
                let val = product[header] || '';
                // Escape quotes for CSV
                val = String(val).replace(/"/g, '""');
                // Wrap in quotes if it contains comma, double quote, or newline
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val}"`;
                }
                return val;
            });
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'all_products_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

