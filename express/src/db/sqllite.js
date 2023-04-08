const sqlite3 = require('sqlite3').verbose();
const md5 = require('md5');

const DBSOURCE = 'db.sqlite';

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
    db.run(
      `CREATE TABLE keys (
            pubKey text PRIMARY KEY,
            privKey text
            )`,
      (err) => {
        if (err) {
          // Table already created
          console.log(err);
        } 
      }
    );
    db.run(
      `CREATE TABLE VCs (
            id INTEGER PRIMARY KEY,
            data text
            )`,
      (err) => {
        if (err) {
          console.log(err);
        } 
      }
    );
    db.run(
      `CREATE TABLE DIDs (
            id text PRIMARY KEY,
            pubKey text,
            data text,
            FOREIGN KEY(pubKey) REFERENCES keys(pubKey)
            )`,
      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );
    db.run(
      `CREATE TABLE LoyaltyPrograms (
            lpId text PRIMARY KEY,
            lpName text,
            issuerDid text
            )`,
      (err) => {
        if (err) {
          console.log(err);
        } 
      }
    );
  }
});

module.exports = db;
