const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws')
const fs = require('fs');

const connectedClients = new Set()
app.get('/log',(req,res) => {
    res.writeHead(200,{'Content-Type':'text/html'});
    const html = fs.readFileSync('index.html','utf8');
    res.end(html)
})

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

const logFileName = 'mylog.log'
const batchSize = 10;
let logBuffer = [];

// send log messages to the client


server.listen(8080,()=>{
    console.log('Server is running on http://localhost:8080');
})

function generateLogMessage(){
    setInterval(()=>{
        const timestamp = new Date().toISOString();
        const logMessage = `Log entry at ${timestamp} \n`
        fs.appendFileSync(logFileName, logMessage + '\n')
        broadcast(logMessage);
    },1000)
}

generateLogMessage()

function readLastNLines(filepath,n){
    const fileContent = fs.readFileSync(filepath, 'utf-8')
    const lines = fileContent.split('\n').filter(line=>line.trim()!== '');
    const lasttNlines = lines.slice(-n);
    return lasttNlines;
}

function watchLogfile(ws){
    const initLogs = readLastNLines(logFileName, 10);
    initLogs.join('\n')
    ws.send(JSON.stringify(initLogs));
    const watcher = fs.watch(logFileName, ()=>{
        const newLogs = readLastNLines(logFileName, 1);
        ws.send(JSON.stringify(newLogs[0]))
    })
    ws.on('close',()=>watcher.close())
    connectedClients.delete(ws)
}

wss.on('connection',(ws)=>{
    console.log('client connected')
    connectedClients.add(ws)
    ws.on('message', (message)=>{
        console.log(`Received message: ${message}`);
    })
    watchLogfile(ws)
})

function broadcast(logUpdates){
    connectedClients.forEach((client)=>{
        client.send(JSON.stringify(logUpdates))
    })
}