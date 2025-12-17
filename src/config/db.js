const mongoose = require('mongoose');

// Cached connection for Serverless
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            // useNewUrlParser and useUnifiedTopology are distinct but deprecated/default now in Mongoose 6+
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log(`MongoDB Connected: ${cached.conn.connection.host}`);
    } catch (e) {
        cached.promise = null;
        console.error(e);
        throw e;
    }

    return cached.conn;
};

module.exports = connectDB;
