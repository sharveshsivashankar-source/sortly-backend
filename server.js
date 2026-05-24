const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('WORKING');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RUNNING ON ${PORT}`);
});
