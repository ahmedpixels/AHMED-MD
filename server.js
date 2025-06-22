const express = require('express');
const config = require('./config');
const { getQr, connected } = require('./sessionState');

const app = express();

app.get('/', (req, res) => {
  if (connected.value) {
    res.send(`
      <h2>${config.botName} is connected ✅</h2>
      <p>Owner: ${config.ownerName}</p>
      <p><a href="${config.aliveImg}" target="_blank"><img src="${config.aliveImg}" width="200"/></a></p>
      <pre>${config.aliveMsg}</pre>
    `);
  } else if (getQr.value) {
    res.send(`
      <h2>Scan this QR to connect ${config.botName}</h2>
      <img src="https://api.qrserver.com/v1/create-qr-code/?data=${getQr.value}&size=200x200" />
      <p>QR will refresh if expired.</p>
    `);
  } else {
    res.send('<h2>Waiting for QR...</h2>');
  }
});

app.listen(config.port, () => {
  console.log(`🌐 Web panel running at http://localhost:${config.port}`);
});
