const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 简单的静态文件服务器
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(500);
            res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            res.end();
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 8082;
server.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
    
    console.log('Starting localtunnel...');
    const lt = exec(`npx --yes localtunnel --port ${PORT}`);
    
    lt.stdout.on('data', (data) => {
        console.log(data.toString());
        // 如果输出了 your url is: https://...
        if(data.includes('your url is:')) {
            console.log('\n==================================================');
            console.log('请用您的手机浏览器打开上面这个 https:// 开头的网址！');
            console.log('==================================================\n');
        }
    });
    
    lt.stderr.on('data', (data) => {
        console.error('Error:', data.toString());
    });
});
