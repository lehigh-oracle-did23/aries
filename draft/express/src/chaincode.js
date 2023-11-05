const axios = require('axios');

exports.createDID = async (key) => {
    let userPass = process.env.user + ":" + process.env.pass;

    var data = JSON.stringify({
        "chaincode": process.env.Chaincode,
        "args": [
          "CreateDIDDocument",
          key
        ],
        "sync": true
      });
      
    let config = {
        url: process.env.ChaincodeInvokeUrl,
        method: 'post', 
        headers: {
          'Authorization': 'Basic YmFsYS52ZWxsYW5raUBvcmFjbGUuY29tOldlbGNvbWUjIzEyMzQ1', 
            'Content-Type': 'application/json',
        }, 
        data: data
    }

    try
    {
        let res = await axios(config); 
        return res.data.result.payload;
    }
    catch(err)
    {
        console.log(err);
        return null;
    }
    
}

exports.getKeyFromDID = async (DID) => {
  let userPass = process.env.user + ":" + process.env.pass;

  var data = JSON.stringify({
      "chaincode": process.env.Chaincode,
      "args": [
        "GetDidDocumentById",
        DID
      ],
      "sync": true
    });
  let config = {
      url: process.env.ChaincodeQueryUrl,
      method: 'post', 
      headers: {
          'Authorization': 'Basic YmFsYS52ZWxsYW5raUBvcmFjbGUuY29tOldlbGNvbWUjIzEyMzQ1',
          'Content-Type': 'application/json',
      }, 
      data: data
  }

  try
  {
      let res = await axios(config); 
      console.log(res.data.result.payload);
      return res.data.result.payload;
  }
  catch(err)
  {
      console.log(err);
      return null;
  }
  
}

exports.deleteDID = async (did) => {
    let userPass = process.env.user + ":" + process.env.pass;

    var data = JSON.stringify({
        "chaincode": process.env.Chaincode,
        "args": [
          "DeleteDidDocument",
          did
        ],
        "sync": true
      });
      
      var config = {
        method: 'post',
        url: process.env.ChaincodeInvokeUrl,
        headers: { 
          'Authorization': 'Basic YmFsYS52ZWxsYW5raUBvcmFjbGUuY29tOldlbGNvbWUjIzEyMzQ1', 
          'Content-Type': 'application/json'
        },
        data : data
      };

    try
    {
        let res = await axios(config); 
        console.log(res.data.result.payload.id);
        return res.data.result.payload.id;
    }
    catch(err)
    {
        console.log(err);
        return null;
    }
    
}