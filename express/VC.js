export const createVerifiableCredential = (issuerId, type, credentialSubject, proof) =>{
    let VC = {}
    VC.issuerId = issuerId
    VC.type = type
    VC.credentialSubject.receiverId = credentialSubject.receiverId
    VC.credentialSubject.info = info
    VC.dateIssued = new Date().toString()
    VC.proof = proof.type
    VC.proof.created = new Date().toString()
    VC.proof.proofPurpose = proof.proofPurpose
    VC.proof.proofPurpose.assertionMethod = VC.proofPurpose.assertionMethod
    VC.proof.issuerPubKey = proof.issuerPubKey
    VC.digitalSignature = proof.digitalSignature

}