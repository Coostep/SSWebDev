const express = require('express')
const app = express();
const PORT = 3001;


app.use(express.static('public'));

// setting up a catch when user accesses
// api address
app.get('/api', (req, res) => {
        res.send("Hi there");
});


app.listen(PORT, '143.198.14.81', () => {
        console.log(`Server running on PORT ${PORT}`);
}); 
