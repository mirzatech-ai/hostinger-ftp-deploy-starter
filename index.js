const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>Success! Node.js Live via Fold 5</h1>');
});

app.listen(port, () => {
  console.log('Server active on port ' + port);
});
