const crypto = require('crypto');
const fs = require('fs');


exports.sign = (doc, private_key) =>{
  // See keys/README.md on how to generate this key
  // const private_key = fs.readFileSync('blank.pem', 'utf-8');
  
  // File/Document to be signed
  // const doc = fs.readFileSync('testertext.txt');
  
  // Signing
  const signer = crypto.createSign('RSA-SHA256');
  signer.write(doc);
  signer.end();
  
  // Returns the signature in output_format which can be 'binary', 'hex' or 'base64'
  const signature = signer.sign(private_key, 'base64')
  
  // Write signature to the file `signature.txt`
  //fs.writeFileSync('signature.txt', signature);
  return signature;
}


exports.verify = (doc, signature, public_key) =>{
 // Signing
 const verifier = crypto.createVerify('RSA-SHA256');
 verifier.write(doc);
 verifier.end();

 // Verify file signature ( support formats 'binary', 'hex' or 'base64')
 const result = verifier.verify(public_key, signature, 'base64');

 console.log('Digital Signature Verification : ' + result);

 return result;
}



const encrypt = () =>{
    const doc = fs.readFileSync('testertext.txt');
    const public_key = fs.readFileSync('blank.pub', 'utf-8');
    const encryptedData = crypto.publicEncrypt(
        {
          key: public_key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        // We convert the data string to a buffer using `Buffer.from`
        Buffer.from(doc)
      );
    console.log("Encrypted Data: " + encryptedData)
    return encryptedData
}

const decrypt =(encryptedData) =>{
    // let signature = Buffer.from(fs.readFileSync('signature.txt', 'utf-8'));
    // let public_key = fs.readFileSync('blank.pub', 'utf-8');
    // // const decrypted = crypto.publicDecrypt(public_key,
    // //     Buffer.from(signature, 'base64'));


    // let decrypted = crypto.publicDecrypt(public_key, signature)

    // console.log(decrypted.toString())
    const private_key = fs.readFileSync('blank.pem', 'utf-8');

    const decryptedData = crypto.privateDecrypt(
        {
          key: private_key,
          // In order to decrypt the data, we need to specify the
          // same hashing function and padding scheme that we used to
          // encrypt the data in the previous step
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        encryptedData
      );
      
      // The decrypted data is of the Buffer type, which we can convert to a
      // string to reveal the original data
      console.log("decrypted data: ", decryptedData.toString());

}
