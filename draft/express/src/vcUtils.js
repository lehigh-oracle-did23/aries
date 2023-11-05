const mongoose = require("./db/mongoose.js").mongoose;
const chaincode = require('./chaincode.js')
const jwkToPem = require('jwk-to-pem'),jwt = require('jsonwebtoken');
const Schema = mongoose.Schema;

const VCSchema = new Schema({
    context: Object,
    type: Object,
    credentialSubject: Object,
    proof: Object,
});

VCSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Ensure virtual fields are serialised.
VCSchema.set('toJSON', {
    virtuals: true
});

VCSchema.findById = function (cb) {
    return this.model('VCs').find({id: this.id}, cb);
};


const VC = mongoose.model('ReqVCs', VCSchema);


exports.findByIssuerDId = async (issuerDid) => {
    return await VC.find({username: issuerDid});
};

exports.findRequestsByIssuerDId = async (issuerDid) => {
    return await VC.find({issuerDid: issuerDid}).select({id: 1, request: 1, issuerDid: 1});
};

exports.findByHolderDId = async (holderDid) => {
    return await VC.find({holderDid: holderDid});
};

exports.findRequestsByHolderDid = async (holderDid) => {
    return await VC.find({holderDid: holderDid}).select({id: 1, request: 1, holderDid: 1});
};

exports.customFind = async (params) => {
    return await VC.find(params).select({id: 1, request: 1, username: 1});
};

exports.findById = (id) => {
    return VC.findById(id)
        .then((result) => {
            result = result.toJSON();
            delete result._id;
            delete result.__v;
            return result;
        });
};

exports.findRequestById = (id) => {
    return VC.findById(id).select({id: 1, request: 1, username: 1});
};

exports.createVC = async (VCData) => {
    const vc = new VC(VCData);
    return await vc.save();
};

exports.list = (perPage, page) => {
    return new Promise((resolve, reject) => {
        VC.find()
            .limit(perPage)
            .skip(perPage * page)
            .exec(function (err, VCs) {
                if (err) {
                    reject(err);
                } else {
                    resolve(VCs);
                }
            })
    });
};

exports.patchVC = async (id, VCData) => {
    return await VC.findOneAndUpdate({
        _id: id
    }, VCData);
};

exports.removeById = (VCId) => {
    return new Promise((resolve, reject) => {
        VC.deleteMany({_id: VCId}, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(err);
            }
        });
    });
};

exports.getPublicKeyUsingDid =  async (DID, res) => {
    var pubKeyPem = "";
    let didDetails = await chaincode.getKeyFromDID(DID);
    if (!didDetails) {
        //pubKeyPem = "Key for the DID not found";
      //res.status(404).json("Key for the DID not found.");
      return pubKeyPem;
    }
    console.log("didDetails is --->" + didDetails);
    var didDetailsObj = JSON.stringify(didDetails);
    console.log("didDetailsObj is --->" + didDetailsObj);
    var didDetailsObjParse = JSON.parse(didDetailsObj);
    var pubkeyObj1 = JSON.stringify(didDetailsObjParse.verificationMethod[0].publicKeyJwk)
    console.log("Public Key Ojbect is is" + pubkeyObj1)
    var pubkeyObj = didDetailsObjParse.verificationMethod[0].publicKeyJwk
    pubKeyPem = jwkToPem(pubkeyObj);
    console.log("Public Key PEM is" + pubKeyPem)
    //let ret = {message: "Success", publicKey : pubKeyPem}
    //res.status(200).json(ret);
    return pubKeyPem;
};
