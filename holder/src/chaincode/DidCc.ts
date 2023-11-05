const axios = require("axios");

const bcUrl = process.env.BC_URL;
const bcChannel = process.env.BC_CHANNEL;
const bcChaincodeName = process.env.BC_DID_CHAINCODE_NAME;

exports.createDID = async (
    encodedCredentials: string,
    key: string 
    ) => {

  var data = JSON.stringify({
    chaincode: bcChaincodeName,
    args: ["CreateDIDDocument", key],
    sync: true,
  });

  let config = {
    url: `${bcUrl}/api/v2/channels/${bcChannel}/transactions`,
    method: "post",
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    let res = await axios(config);
    return res.data.result.payload;
  } catch (err) {
    console.log(err);
    return null;
  }
};

exports.resolveDID = async (
    encodedCredentials: string,
    did: string 
    ) => {

    var data = JSON.stringify({
        chaincode: bcChaincodeName,
        args: ["GetDidDocumentById", did],
        sync: true,
        });

    let config = {
        url: `${bcUrl}/api/v2/channels/${bcChannel}/transactions`,
        method: "post",
        headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/json",
        },
        data: data,
    };

    try {
        let res = await axios(config);
        return res.data.result.payload;
    } catch (err) {
        console.log(err);
        return null;
    }
};

exports.updateDID = async (
    encodedCredentials: string,
    did_id: string,
    did_controller: string,
    modification: string,
    method_id?: string // make this optional
    ) => {

    // check if modification begins with AddNew, Add, or Remove
    let call = "";
    if (modification.startsWith("AddNew")) {
        call = "AddNewMethod";
    } else if (modification.startsWith("Add")) {
        call = "AddMethod";
    } else if (modification.startsWith("Remove")) {
        call = "RemoveMethod";
    } else {
        console.log("Invalid modification");
        return null;
    }

    var data = JSON.stringify({
      chaincode: bcChaincodeName,
      args: [call, did_id, did_controller, modification],
      sync: true,
    });

    if (call !== "AddNewMethod" && method_id) {
        // Parse data into an object
        const parsedData = JSON.parse(data);
        // Push method_id to the args array
        parsedData.args.push(method_id);
        // Stringify the object back into a string
        data = JSON.stringify(parsedData);
    }

    let config = {
        url: `${bcUrl}/api/v2/channels/${bcChannel}/transactions`,
        method: "post",
        headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/json",
        },
        data: data,
    };

    try {
        let res = await axios(config);
        return res.data.result.payload;
    } catch (err) {
        console.log(err);
        return null;
    }
};

exports.deleteDID = async (
    encodedCredentials: string, 
    did: string
    ) => {
  var data = JSON.stringify({
    chaincode: bcChaincodeName,
    args: ["DeleteDidDocument", did],
    sync: true,
  });

  let config = {
    url: `${bcUrl}/api/v2/channels/${bcChannel}/transactions`,
    method: "post",
    headers: {
      Authorization: encodedCredentials, // Use the provided encodedCredentials directly
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    let res = await axios(config);
    return res.data.result.payload;
  } catch (err) {
    console.log(err);
    return null;
  }
};
