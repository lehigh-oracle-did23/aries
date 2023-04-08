const mongoose = require('mongoose');
const dotenv = require('dotenv');
let count = 0;


dotenv.config();

const options = {
    //autoIndex: false, // Don't build indexes
    //poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    //bufferMaxEntries: 0,
    // all other approaches are now deprecated by MongoDB:
    useNewUrlParser: true,
    //useUnifiedTopology: true
    
};
const connectWithRetry = () => {
    console.log('MongoDB connection with retry')
    mongoose.connect(process.env.mongoURL, options).then(()=>{
        console.log('MongoDB is connected')
    }).catch(err=>{
        console.log('MongoDB connection unsuccessful, retry after 5 seconds. ', ++count);
        console.log(err)
        setTimeout(connectWithRetry, 5000)
    })
};

connectWithRetry();

exports.mongoose = mongoose;