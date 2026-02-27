import mongoose from "mongoose";

const globalForMongoose = globalThis;

if (!globalForMongoose.__mongooseConnection) {
  globalForMongoose.__mongooseConnection = { conn: null, promise: null };
}

export default async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (globalForMongoose.__mongooseConnection.conn) {
    return globalForMongoose.__mongooseConnection.conn;
  }

  if (!globalForMongoose.__mongooseConnection.promise) {
    globalForMongoose.__mongooseConnection.promise = mongoose
      .connect(mongoUri, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    globalForMongoose.__mongooseConnection.conn =
      await globalForMongoose.__mongooseConnection.promise;
  } catch (error) {
    globalForMongoose.__mongooseConnection.promise = null;
    throw error;
  }

  return globalForMongoose.__mongooseConnection.conn;
}
