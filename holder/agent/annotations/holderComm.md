# Holder DIDComm

We're using the ACA-Py holder module to create a credential offer for a specific credential definition ID. We're also using the ConnectionRecord model to retrieve the connection record for the given connection ID, and the RequestContext model to create a context for the message.

We then use the ACA-Py holder module to create the credential offer message, and the session.send_didcomm method to send the message to the other agent using DIDComm.