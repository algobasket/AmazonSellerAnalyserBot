import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import fs from 'fs';
import nodemailer from 'nodemailer'; // Import Nodemailer for email

const allowedSellers = ["Amber Worldwide", "Awwe Sales"];
const unapprovedASINs = []; // Store ASINs with unapproved sellers 
const to_email = [
    "bikash.m@amberww.com",
    "sanjay@amberwworldwide.com",
    "pricing@amberwworldwide.com",
    "chris.j@amberww.com",
    "chirag@amberwworldwide.com"
]; 
const gmailAppUser = "algobasket@gmail.com";
const gmailAppPass = "";


const loadASINs = (file) => {
    const workbook = XLSX.readFile(file);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet).map(row => row.ASIN);
};

const loadExistingData = (file) => {
    if (!fs.existsSync(file)) return {};
    const workbook = XLSX.readFile(file);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return jsonData.slice(1).reduce((acc, row) => {
        const asin = row[0];
        acc[asin] = {
            title: row[1],
            oldPrice: row[2],
            newPrice: row[3],
            priceDiff: row[4],
            availability: row[5],
            seller: row[6],
            deliveryTime: row[7]
        };
        return acc;
    }, {});
};

const scrapeAmazonProduct = async (asin, page) => {
    const url = `https://www.amazon.in/dp/${asin}`;
    console.log(`Scraping ASIN: ${asin} - ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const productData = await page.evaluate((allowedSellers) => {
            const title = document.querySelector('#productTitle')?.innerText.trim() || 'Title not found';
            const price = document.querySelector('.a-price .a-offscreen')?.innerText.replace(/[^0-9.]/g, '') || '0';
            const addToCartBtn = document.querySelector('#add-to-cart-button');
            const availability = addToCartBtn ? 'In Stock' : 'Out of Stock';
            const sellerElement = document.querySelector('#sellerProfileTriggerId') || document.querySelector('.tabular-buybox-text a');
            const sellerName = sellerElement?.innerText.trim() || 'Seller not found';
            const deliveryElement = document.querySelector('#mir-layout-DELIVERY_BLOCK-slot-DELIVERY_MESSAGE span') || document.querySelector('.a-text-bold + span');
            const deliveryTime = deliveryElement?.innerText.trim() || 'Delivery info not found';

            let fulfillmentMethod = "Unknown";
            const shipFromLabel = [...document.querySelectorAll('.tabular-buybox-label')]
                .find(label => label.innerText.includes('Ships from'));

            if (shipFromLabel) {
                const shipFromValue = shipFromLabel.nextElementSibling?.innerText.trim() || 'Unknown';
                fulfillmentMethod = shipFromValue.includes("Amazon") ? "FBA" : "FBM";
            }

            return {
                title,
                sellersInfo: [{
                    sellerName, 
                    price,
                    availability,
                    deliveryTime,
                    fulfillmentMethod,
                    sellerStatus: allowedSellers.includes(sellerName) ? "approved" : "unapproved"
                }]
            };
        }, allowedSellers);

        // Now scrape other sellers
        const sellersUrl = `https://www.amazon.in/dp/${asin}/ref=olp-opf-redir?aod=1&ie=UTF8&condition=NEW`;
        console.log(`🔄 Checking more sellers: ${sellersUrl}`);
        await page.goto(sellersUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const moreSellers = await page.evaluate((allowedSellers) => {
            const sellerRows = document.querySelectorAll('[id="aod-offer"]');
            let sellersList = [];

            sellerRows.forEach(row => {
                const sellerName = row.querySelector('#aod-offer-soldBy a')?.innerText.trim() || 'Unknown Seller';
                const price = row.querySelector('.a-price .a-offscreen')?.innerText.replace(/[^0-9.]/g, '') || '0';
                const shipFromElement = row.querySelector('#aod-offer-shipsFrom span');
                const fulfillmentText = shipFromElement ? shipFromElement.innerText.trim() : 'Unknown';

                let fulfillmentMethod = fulfillmentText.includes("Amazon") ? "FBA" : "FBM";

                const addToCartBtn = row.querySelector('.AodAddToCart');
                const availability = addToCartBtn ? 'In Stock' : 'Out of Stock';

                const deliveryElement = row.querySelector('#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE span') || row.querySelector('.a-text-bold + span');
                const deliveryTime = deliveryElement?.innerText.trim() || 'Delivery info not found';

                sellersList.push({ 
                    sellerName, 
                    price, 
                    availability, 
                    deliveryTime, 
                    fulfillmentMethod, 
                    sellerStatus: allowedSellers.includes(sellerName) ? "approved" : "unapproved"
                });
            });

            return sellersList;
        }, allowedSellers);

        // Append more sellers to the data
        productData.sellersInfo.push(...moreSellers);

        // Check for unapproved sellers  
        if (productData.sellersInfo.some(seller => seller.sellerStatus === "unapproved")) {
            unapprovedASINs.push({ asin, title: productData.title }); 
        }

        return productData;
    } catch (error) {
        console.error(`❌ Error scraping ASIN: ${asin} - ${error.message}`);
        return { title: 'Error', sellersInfo: [] };
    }
};


const sendEmail = async () => {
    if (unapprovedASINs.length === 0) {
        console.log("✅ No unapproved sellers detected. No email sent.");
        return;
    }

    console.log("📧 Sending email for unapproved ASINs...");

    const transporter = nodemailer.createTransport({
        service: "gmail", // Change if using another email service
        auth: {
            user: gmailAppUser,
            pass: gmailAppPass  
        }
    });

    const emailBody = unapprovedASINs.map(item => `ASIN: ${item.asin} - ${item.title}`).join("\n");

    const mailOptions = {
        from: gmailAppUser,
        //to: to_email.join(","),  
        to: "goldenbeast256@gmail.com", 
        subject: "🚨 Alert: Unapproved Sellers Detected on Amazon",
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto; background: #f9f9f9;">
            <h2 style="color: #d32f2f; text-align: center;">🚨 Unapproved Sellers Detected on Amazon</h2>
            <p style="font-size: 16px; color: #333; text-align: center;">
                <strong>The following ASINs have unapproved sellers:</strong>
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #007bff; color: #fff;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">ASIN</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                    </tr>
                </thead>
                <tbody>
                    ${unapprovedASINs.map(item => `
                        <tr style="background: #fff;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${item.asin}</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                <a href="https://www.amazon.in/dp/${item.asin}" target="_blank" style="color: #007bff; text-decoration: none;">
                                    ${item.title}
                                </a>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
                Please take necessary action.  
            </p>
        </div>  
    `
    };  

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully!");
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};



(async () => {
    const asins = loadASINs('ASINs.xlsx');
    const existingData = loadExistingData('output.xlsx');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');

    const results = [];

    for (const asin of asins) {
        const productData = await scrapeAmazonProduct(asin, page);

        const oldPrice = existingData[asin]?.newPrice || '0';
        const priceDiff = productData.sellersInfo.length > 0
            ? (parseFloat(productData.sellersInfo[0].price) - parseFloat(oldPrice)).toFixed(2)
            : '0';
        console.log(productData);   
        results.push({
            ASIN: asin,
            title: productData.title,
            oldPrice,
            newPrice: productData.sellersInfo.length > 0 ? productData.sellersInfo[0].price : '0',
            priceDiff: priceDiff !== 'NaN' ? (priceDiff > 0 ? `+${priceDiff}` : priceDiff) : '0',
            sellersInfo: productData.sellersInfo
        });

        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000));
    }

    await browser.close(); 
    await sendEmail(); // Send email at the end  

    const newSheet = XLSX.utils.json_to_sheet(results);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Results');
    XLSX.writeFile(newWorkbook, 'output.xlsx');

    console.log('✅ Scraping complete! Results saved to output.xlsx');      
})();

