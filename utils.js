const { connect, keyStores, KeyPair } = require('near-api-js')

//configuration for connection to NEAR
const nearConfig = {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    contractName: `client.${process.env.NEAR_ACCT}`,
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org'
};

// These get set the first time we attempt a connection, and get
// returned by getNear and getClientAcct below so we aren't unnecessarily
// making more calls
let near;
let clientAcct;

async function connectToNear() {
    // sets key in memory
    if (nearConfig.contractName.endsWith('undefined') || nearConfig.contractName.substr(nearConfig.contractName.length - 1) === '.') {
        console.warn('Please make sure you have set environment variables NEAR_ACCT and CLIENT_PRIVATE_KEY')
        return null;
    } else {
        const keyStore = new keyStores.InMemoryKeyStore()
        const keyPair = KeyPair.fromString(process.env.CLIENT_PRIVATE_KEY)
        await keyStore.setKey(nearConfig.networkId, nearConfig.contractName, keyPair)
        near = await connect(Object.assign({ deps: { keyStore } }, nearConfig))
        return near;
    }
}

const getNear = async function getNear() {
    return near || await connectToNear();
}

//connect to contract using .env private key
const initContract = async function initContract() {
    const initNear = await getNear();
    if (initNear) {
        clientAcct = await initNear.account(near.config.contractName)
        return clientAcct;
    }
}

const getClientAcct = async function getClientAcct() {
    return clientAcct || await initContract();
}









const nearConfig1 = {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    contractName: `oracle.${process.env.NEAR_ACCT}`,
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org'
};

// These get set the first time we attempt a connection, and get
// returned by getNear1 and getOracleAcct below so we aren't unnecessarily
// making more calls
let near1;
let oracleAcct;

async function connectToNear1() {
    // sets key in memory
    if (nearConfig1.contractName.endsWith('undefined') || nearConfig1.contractName.substr(nearConfig1.contractName.length - 1) === '.') {
        console.warn('Please make sure you have set environment variables NEAR_ACCT and ORACLE_PRIVATE_KEY')
        return null;
    } else {
        const keyStore = new keyStores.InMemoryKeyStore()
        const keyPair = KeyPair.fromString(process.env.ORACLE_PRIVATE_KEY)
        await keyStore.setKey(nearConfig1.networkId, nearConfig1.contractName, keyPair)
        near1 = await connect(Object.assign({ deps: { keyStore } }, nearConfig1))
        return near1;
    }
}

const getNear1 = async function getNear1() {
    return near1 || await connectToNear1();
}

//connect to contract using .env private key
const initContract1 = async function initContract1() {
    const initNear = await getNear1();
    if (initNear) {
        oracleAcct = await initNear.account(near1.config.contractName)
        return oracleAcct;
    }
}

const getOracleAcct = async function getOracleAcct() {
    return oracleAcct || await initContract1();
}

module.exports = {
    getNear,
    initContract,
    getClientAcct,
    getNear1,
    initContract1,
    getOracleAcct,
}