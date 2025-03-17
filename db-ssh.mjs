import mysql from 'mysql2';

const { default: tunnel } = await import('tunnel-ssh'); // ✅ Fix for ESM

const sshConfig = {
    host: '139.59.73.179',
    port: 22,
    username: 'amber_kepa',
    password: 'amber#Keep#321',
    dstHost: '127.0.0.1',
    dstPort: 3306,
    localHost: '127.0.0.1',
    localPort: 3307
};

const createConnection = () => {
    return new Promise((resolve, reject) => {
        tunnel(sshConfig, (err, server) => {
            if (err) {
                console.error('❌ SSH Tunnel Error:', err);
                reject(err);
                return;
            }

            console.log('✅ SSH Tunnel established');

            const connection = mysql.createConnection({
                host: '139.59.73.179',
                port: 3307,
                user: 'kffqdvqmer',
                password: 'QdRhZ4fRT3', 
                database: 'kffqdvqmer' 
            });

            connection.connect((err) => {
                if (err) {
                    console.error('❌ MySQL Connection Error:', err.stack);
                    reject(err);
                    return;
                }
                console.log('✅ Connected to MySQL via SSH');
                resolve(connection);
            });
        });
    });
};

createConnection();

export default createConnection;
