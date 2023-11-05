const express = require('express');
//const oracledb = require('oracledb');
const sqlite3 = require('sqlite3').verbose();
//const db1 = require('./oradb-connect.js');
const db = require('./src/db/sqllite.js');
const vcRequestModel = require('./src/vcUtils.js')
const chaincode = require('./src/chaincode.js')
const bodyParser = require('body-parser');
const app = express();
const crypto = require('crypto');
const cryptojs = require("./src/cryptojs");
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const { is } = require('express/lib/request');
// get config vars
dotenv.config();
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
app.set('port', process.env.PORT || 4001);
/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log(
    'App is running at http://localhost:%d in %s mode',
    app.get('port'),
    app.get('env')
  );
  console.log('Press CTRL-C to stop\n');
});
app.get('/api/keys', (req, res, next) => {
  const sql = 'select * from keys';
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: rows,
    });
  });
});
app.get('/api/key/:key', (req, res, next) => {
  const sql = 'select * from keys where pubKey = ?';
  const params = [req.body.key];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: row,
    });
  });
});
app.get('/api/VCS', (req, res, next) => {
  const sql = 'select * from VCs';
  const params = [];
  db.all(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: row,
    });
  });
});
app.get('/api/VC', (req, res, next) => {
  const sql = 'select * from VCs where pubKey = ?';
  const params = [req.body.key];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: row,
    });
  });
});
app.get('/api/DIDs', (req, res, next) => {
  const sql = 'select * from DIDs where pubKey = ?';
  const params = [req.body.key];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: rows,
    });
  });
});
app.post('/api/key/', (req, res, next) => {
  const errors = [];
  console.log(req.body);
  if (!req.body.pubKey) {
    errors.push('No pubkey specified');
  }
  if (!req.body.privKey) {
    errors.push('No privKey specified');
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') });
    return;
  }
  const data = {
    pubKey: req.body.pubKey,
    privKey: req.body.privKey,
  };
  const sql = 'INSERT INTO keys (pubKey, privKey) VALUES (?,?)';
  const params = [data.pubKey, data.privKey];
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data,
      id: this.lastID,
    });
  });
});



app.post('/api/VC', (req, res, next) => {
  const errors = [];
  if (!req.body.id) {
    errors.push('No ID for VC specified');
  }
  if (!req.body.data) {
    errors.push(`No data for VC with id${req.body.id}`);
  }
  if (!req.body.key) {
    errors.push(`No key specified, can't assign VC${req.body.id}`);
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') });
    return;
  }
  const data = {
    pubKey: req.body.key,
    data: req.body.data,
    id: req.body.id,
  };
  const sql = 'INSERT INTO VCs (id, pubKey, data) VALUES (?,?,?)';
  const params = [data.id, data.pubKey, data.data];
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data,
      id: this.lastID,
    });
  });
});
app.get('/api/keygen', (req, res, next) => {
  crypto.generateKeyPair(
    'rsa',
    {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        // cipher: 'aes-256-cbc',
        // passphrase: 'top secret'
      },
    },
    (err, publicKey, privateKey) => {
      if (!err) {
        const data = {
          pubKey: publicKey,
          privKey: privateKey,
        };
        res.json({
          message: 'success',
          data
        });
      } else {
        console.log(err);
      }
    }
  );
});
app.post('/api/encrypt', (req, res, next) => {
  try {
    const { pubKey } = req.body;
    const message = req.body.data;
    const encryptedData = crypto.publicEncrypt(
      {
        key: pubKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      // We convert the data string to a buffer using `Buffer.from`
      Buffer.from(message)
    );
    console.log(`Encrypted Data: ${encryptedData}`);
    res.status(200).json({ message: 'Success', data: encryptedData });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
});
app.post('/api/decrypt', (req, res, next) => {
  try {
    const { privKey } = req.body;
    const message = req.body.data;
    const decryptedData = crypto.privateDecrypt(
      {
        key: privKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      message
    );
    console.log('decrypted data: ', decryptedData.toString());
    res.status(200).json({ message: 'Success', data: decryptedData });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
});
app.post('/api/sign', (req, res, next) => {
  try {
    const { privKey } = req.body;
    const message = req.body.data;
    const signer = crypto.createSign('RSA-SHA256');
    signer.write(message);
    signer.end();
    // Returns the signature in output_format which can be 'binary', 'hex' or 'base64'
    const signature = signer.sign(privKey, 'base64');
    console.log('Digital Signature: ', signature);
    res.status(200).json({ message: 'Success', data: signature });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
});

app.post('/api/verify', (req, res, next) => {
  try {
    const { pubKey } = req.body;
    const { signature } = req.body.data;
    const { message } = req.body.data;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(message);
    verifier.end();
    // Verify file signature ( support formats 'binary', 'hex' or 'base64')
    const result = verifier.verify(pubKey, signature, 'base64');
    console.log(`Digital Signature Verification : ${result}`);
    res.status(200).json({
      message: `Success: The verification outcome is - ${result}`,
      data: result,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
});

app.post('/api/generateDID', async (req, res, next) => {
  try {
    if(!req.body.key)
    {
      res.status(400).json('Must Provide Key');
    }
    let pubKey = req.body.key;
    // Verify file signature ( support formats 'binary', 'hex' or 'base64')
    let result = await chaincode.createDID(pubKey);
    if(result == null)
    {
      res.status(400).json('DID creation failed');
    }
    res.status(200).json({
      message: `Success`,
      data: result,
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error' });
  }
});
app.post('/api/getVCs', async (req, res, next) => {
  try {
    const data = JSON.stringify({
      username: req.body.username,
      password: req.body.password,
    });
    const config = {
      method: 'post',
      url: 'UNDEFINED AT MOMENT',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    };
    const response = await axios(config);
    res
      .status(200)
      .json({ message: 'Success', data: JSON.stringify(response) });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
});

app.post('/api/requestVC', async (req, res) => {
  
  try {

          if(!req.body.requestVC.lpId || !req.body.requestVC.holderDid ||!req.body.requestVC.lpName )
      {
        res.status(403).json("Request Failed: HolderDID or IssuerDID not provided"); 
        return;
      }
        
        var d1 = new Date();
        var holderDid = req.body.requestVC.holderDid;
        var lpId = req.body.requestVC.lpId;
        var lpName = req.body.requestVC.lpName;
        
        console.log("Holder Did is----" + req.body.requestVC.holderDid);

        let context = JSON.parse(`[
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1"
        ]`);

        var ctype = `[
          "Verified Credential","` + req.body.requestVC.lpName + `"
        ]`;

        var  credentialSubject = `{
          "issuerId":"`+ process.env.issuerDid +`",
          "issuedDate":"` + d1.toISOString() + `",
          "expriyDate":"` + d1.toISOString() + `", 
          "memberOf": 
            {
            "holderId":"` + holderDid + `",
            "loyaltyProgram": 
              [
                {
                  "lpId":"`+ lpId + `",
                  "lpName":"`+ lpName + `",
                  "lpMemberNumber":"lpmem123456",
                  "lpmemberType":"Gold",
                  "lpPoints":"3000"
                }
              ]
            }
        }`;


        //var  credentialSubject = JSON.parse(`{"credentialSubject": { + "issuerId":"`+ process.env.issuerDid + `","issuedDate":"` + d1.toISOString() + `","expriyDate":"` + d1.toISOString() + `","memberOf": {"holderId":"` + holderDid + `","loyaltyProgram": [{"lpId":"`+ lpId + `","lpName":"`+ lpName + `","lpMemberNumber":"lpmem123456","lpmemberType":"Gold","lpPoints":"3000"}]}}}`; 

        console.log ("credentialSubject is" + credentialSubject)
        var vcSubject = JSON.parse(credentialSubject)

        //let vcSubject = JSON.stringify(credentialSubject);
           
        const private_key = fs.readFileSync('./keys/oneoff-lpkey.pem', 'utf-8');
        //var request = { status: , createdDate: d1.toISOString(), type: "issue"};
        
        let signature = cryptojs.sign(JSON.stringify(vcSubject), private_key);
        let proof = {"type": "RSA-SHA256", "created": d1.toISOString(), "proofPurpose": "assertionMethod", "jws": signature};
      
  
        var reqVCObject = {
          "context": context,
          "type": JSON.parse(ctype),
          "credentialSubject": vcSubject,
          "proof": proof
        }
       

          await vcRequestModel.createVC(reqVCObject)
          .then(async (result) => {
              console.log("reqVCObject");
              console.log("Object ID---" + result._id);
              res.json({
                "message":"Success",
                "requestId": result._id,
                "data":reqVCObject,
                
              });
            });
        }
       catch (err) {
        console.log(err);
        res.status(400).json({ message: 'Error' });
      }
      
   })

app.post('/api/verifyVC', async (req, res) => {
  try
  {
   
    let VC = req.body.validateVC;
    console.log("Request Body is" + VC);
    if(!VC.verifiedCredential[0].credentialSubject.issuerId)
    {
      res.status(403).json("Request Failed: Issuer DID, Holder DID, or the Proof not provided"); 
      return;
    }
   
    let public_key_holderDid = await vcRequestModel.getPublicKeyUsingDid(VC.verifiedCredential[0].credentialSubject.memberOf.holderId);

    if(public_key_holderDid == null)
    {
      res.status(400).json({ message: 'Error',reason: "No key associated with Holder DID "+ VC.verifiedCredential[0].credentialSubject.memberOf.holderId });
      return;
    }

    let public_key_issuerDid = await vcRequestModel.getPublicKeyUsingDid(VC.verifiedCredential[0].credentialSubject.issuerId);

    if(public_key_issuerDid == null)
    {
      res.status(400).json({ message: 'Error',reason: "No key associated with Issuer DID "+ VC.verifiedCredential[0].credentialSubject.issuerId});
      return;
    }

    //let toVerify = VC.credentialSubject;

    //let result = cryptojs.verify(toVerifyString, VC.proof.jws, public_key)

    let issuerToSign = VC.verifiedCredential[0].credentialSubject;
    let issuerToVerifyString = JSON.stringify(issuerToSign);
    let issuer_verification = cryptojs.verify(issuerToVerifyString, VC.verifiedCredential[0].proof.jws, public_key_issuerDid);
    console.log("Issuer Verification" + issuer_verification)
    if(!issuer_verification)
    {
      res.status(400).json({ message: 'Error',reason: "Verfied Credential Issuer Proof is not Valid"});
      return;
    }else {
      let holderToSign = VC.verifiedCredential[0];
      let holderToVerifyString = JSON.stringify(holderToSign);
      console.log("Holder Verificaion Doc ---" + holderToVerifyString)
      console.log("Holder Verificaion Public Key ---" + public_key_holderDid)
      console.log("Holder Verificaion JWS ---" + VC.proof.jws)
      let holder_verification = cryptojs.verify(holderToVerifyString, VC.proof.jws, public_key_holderDid);
      console.log("Holder Verification" + holder_verification)
      if(!holder_verification)
      {
        res.status(400).json({ message: 'Error',reason: "Verfied Credential Holder Proof is not Valid"});
        //res.status(400).json("Verfied Credential Holder Proof is not Valid");
        return;
      }else {
        res
        .status(200)
        .json({ message: 'Success', issuer_verification: JSON.stringify(issuer_verification), holder_verification: JSON.stringify(holder_verification) });
        }   
    }
} catch (err) {
  console.log(err);
  res.status(400).json({ message: 'Error' });
}
  
});

app.post('/api/createProof', async (req, res) => {
  try
  {
    let VC = req.body.validateVC;
    console.log("Request Body is" + VC);
    if(!VC.verifiedCredential[0]) 
    {
      res.status(403).json("Request Failed: Issuer DID, Holder DID, or the Proof not provided"); 
      return;
    }
    var d1 = new Date();
    const private_key = fs.readFileSync('./keys/oneoff-holder.pem', 'utf-8');
    let signature = cryptojs.sign(JSON.stringify(VC.verifiedCredential[0]), private_key);
    let proof = {"type": "RSA-SHA256", "created": d1.toISOString(), "proofPurpose": "assertionMethod", "jws": signature};
    console.log("Proof is ---" + JSON.stringify(proof));
    res.json({
      message: 'Success',
      proof
    });

  }catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Error' });
  }
  
});


app.post('/api/addLoyaltyPrograms', (req, res, next) => {
  const errors = [];
  if (!req.body.lpId) {
    errors.push(`No Loyalty Program Id Specified ${req.body.id}`);
  }
 
  if (!req.body.lpName) {
    errors.push(`No Loyalty Program specified, can't add Loyalty Program ${req.body.lpName}`);
  }


  if (errors.length) {
    res.status(400).json({ error: errors.join(',') });
    return;
  }
  const data = {
    loyaltyProgramId: req.body.lpId,
    loyaltyProgramName: req.body.lpName,
  };
  const sql = 'INSERT INTO LoyaltyPrograms (loyaltyProgramId, loyaltyProgramId) VALUES (?,?,)';
  const params = [data.loyaltyProgramId, data.loyaltyProgramName];
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data,
      id: this.lastID,
    });
  });
});

app.post('/api/updateLoyaltyPrograms', (req, res, next) => {
  const errors = [];
  
  if (!req.body.lpId || !req.body.lpName) {
    errors.push(`No Loyalty Program specified, can't add Loyalty Program ${req.body.lpName}`);
  }


  if (errors.length) {
    res.status(400).json({ error: errors.join(',') });
    return;
  }
  const data = {
    loyaltyProgramId: req.body.lpId,
    loyaltyProgramName: req.body.lpName,
  };
  const sql = `UPDATE LoyaltyPrograms (lpId, lpName) VALUES (?,?,) where lpId = ${req.body.lpId}`;
  const params = [data.loyaltyProgramId, data.loyaltyProgramName];
  db.run(sql, params, function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data,
      id: this.lastID,
    });
  });
});

app.get('/api/getLoyaltyPrograms', (req, res, next) => {
  const sql = 'select * from LoyaltyPrograms';
  const params = [];
  db.all(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: row,
    });
  });
});


app.get('/api/findVCById', async (req, res, next) => {
  try {
    let result = await vcRequestModel.findById(req.body.requestId);
    if (!result) {
      res.status(404).json("VC not found.");
      return;
    }
    res.json({
      message: 'success',
      data: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error' });
  }
});

app.get('/api/getDIDPubkey', async (req, res, next) => {
  try {
    let result =await vcRequestModel.getPublicKeyUsingDid(req.body.DID);
    if (!result) {
      res.status(404).json("Public Key not found.");
      return;
    }
    res.json({
      message: 'success',
      publicKey: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error' });
  }
});