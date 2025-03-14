import { connection, pool } from './db.mjs';

const getAllAsins = (limit) => {
    
    let selectQuery = 'SELECT asin FROM asins ORDER BY id DESC';
    const queryParams = [];

    // If limit is greater than 0, apply LIMIT
    if (limit > 0) {
        selectQuery += ' LIMIT ?';
        queryParams.push(limit);
    }

    return new Promise((resolve, reject) => {
        connection.query(selectQuery, queryParams, (err, results) => { 
            if (err) {
                console.error('Error fetching data:', err.stack);
                reject(err);
            } else {
                resolve(results);
            }
        });
    }); 
};



  const isAlertEmailSent = (asin) => {
    const selectQuery = 'SELECT id FROM alert WHERE asin = ?';   
    return new Promise((resolve, reject) => {
        connection.query(selectQuery, [asin], (err, results) => {  
            if (err) {
                console.error('Error fetching data:', err.stack);
                return reject(err);
            }
            resolve(results.length > 0); 
        });
    }); 
}; 


const changeEmailSentStatus = (asin) => {       
    const insertQuery = `
        INSERT INTO alert (asin, created, updated, status) 
        VALUES (?, NOW(), NOW(), 1) 
        ON DUPLICATE KEY UPDATE 
        updated = NOW(), status = 1
    `;   
    return new Promise((resolve, reject) => {
        connection.query(insertQuery, [asin], (err) => {  
            if (err) {
                console.error('Error inserting/updating data:', err.stack);
                return reject(err);
            }
            resolve();
        });
    }); 
};


// const insertProduct = (asin, seller, title, price, availability, deliveryTime, fulfillmentMethod, sellerStatus) => {
//     const insertQuery = `
//         INSERT INTO output 
//         (asin, seller, title, price, availability, delivery_time, fulfillment_method, seller_status) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     return new Promise((resolve, reject) => {
//         connection.query(insertQuery, 
//             [asin, seller, title, price, availability, deliveryTime, fulfillmentMethod, sellerStatus], 
//             (err, results) => {
//                 if (err) {
//                     console.error('Error inserting data:', err.stack);
//                     return reject(err);
//                 }
//                 resolve(results.insertId); // Returns the new record ID
//             }
//         );
//     });
// }; 
 

const insertProduct = async (asin, seller, title, price, availability, deliveryTime, fulfillmentMethod, sellerStatus) => {
    const selectQuery = `SELECT price FROM output WHERE asin = ? AND seller = ?`;
    const updateQuery = `
        UPDATE output 
        SET title = ?, price = ?, availability = ?, delivery_time = ?, fulfillment_method = ?, seller_status = ?, price_change = ? 
        WHERE asin = ? AND seller = ?
    `;
    const insertQuery = `
        INSERT INTO output 
        (asin, seller, title, price, availability, delivery_time, fulfillment_method, seller_status, price_change) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Fetch the existing price
        const existingPrice = await new Promise((resolve, reject) => {
            connection.query(selectQuery, [asin, seller], (err, results) => {
                if (err) return reject(err);
                resolve(results.length > 0 ? results[0].price : null);
            });
        });

        // Calculate price change
        let priceChange = existingPrice !== null ? (price - existingPrice).toFixed(2) : "0.00";
        priceChange = priceChange > 0 ? `+${priceChange}` : priceChange;

        if (existingPrice !== null) {
            // If record exists, update it
            return new Promise((resolve, reject) => {
                connection.query(updateQuery,
                    [title, price, availability, deliveryTime, fulfillmentMethod, sellerStatus, priceChange, asin, seller],
                    (err, results) => {
                        if (err) {
                            console.error('Error updating data:', err.stack);
                            return reject(err);
                        }
                        resolve(results.affectedRows);
                    }
                );
            });
        } else {
            // If record does not exist, insert it
            return new Promise((resolve, reject) => {
                connection.query(insertQuery,
                    [asin, seller, title, price, availability, deliveryTime, fulfillmentMethod, sellerStatus, priceChange],
                    (err, results) => {
                        if (err) {
                            console.error('Error inserting data:', err.stack);
                            return reject(err);
                        }
                        resolve(results.insertId);
                    }
                );
            });
        }

    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
};   


  

export{ getAllAsins, isAlertEmailSent,changeEmailSentStatus,insertProduct };     