const { getClientAcct, getNear, getOracleAcct } = require('./utils');
const bs58 = require('bs58');
const axios = require('axios');

const nearAcct = process.env.NEAR_ACCT

const getLatestBlockID = async function getLatestBlockID() {
    const near = await getNear();
    const latestHash = (await near
        .connection.provider.status())
        .sync_info.latest_block_hash;
    const latestBlock = await near
        .connection.provider.block(latestHash);
    return latestBlock.header.height
}

const getBlockByHash = async function getBlockByHash(blockHash) {
    const near = await getNear();
    const blockInfoByHash = await near
        .connection.provider.block({
            blockId: blockHash,
        })
    console.log(`BlockInfo for ${blockHash} :`, blockInfoByHash)
    return blockInfoByHash
};

const getBlockByID = async function getBlockByID(blockID) {
    const near = await getNear();
    const blockInfoByHeight = await near
        .connection.provider.block({
            blockId: blockID,
        })
    return blockInfoByHeight
}

const getReceiptsFromAccountPrefix = async function getReceiptsFromAccountPrefix(txObj, prefix, step) {
    const matchingTxs = txObj.receipts_outcome.filter(r => {
        return r.outcome.executor_id === `${prefix}.${nearAcct}` && r.outcome.logs.length !== 0
    })
    global.nearSteps[step] = matchingTxs
}

const getTransaction = async function getTransaction(hash, subaccountPrefix) {
    const near = await getNear();
    return await near.connection.provider.txStatus(bs58.decode(hash), `${subaccountPrefix}.${nearAcct}`);
}

// returns two transactions associated with client <> oracle-node call
const getTransactions = async function getTransactions(firstBlock, lastBlock, nonce) {
    const near = await getNear();

    // creates an array of block IDs based on first and last block
    const blockArr = [];
    let blockHash = lastBlock;
    let currentBlock;
    do {
        currentBlock = await getBlockByID(blockHash);
        blockArr.push(currentBlock.header.hash);
        blockHash = currentBlock.header.prev_hash;
    } while (blockHash !== firstBlock)

    // returns block details based on ID's in array
    const blockDetails = await Promise.all(
        blockArr.map(block => {
            return getBlockByID(block);
        }))

    // returns an array of chunk hashes from block details
    const chunkHashArr = [];
    blockDetails.map(block => {
        block.chunks.map(chunk => {
            chunkHashArr.push(chunk.chunk_hash);
        });
    });

    // returns chunk details based from the array of hashes
    const chunkDetails = await Promise.all(
        chunkHashArr.map(chunk => {
            return near.connection.provider.chunk(chunk);
        }));

    // checks chunk details for transactions
    // if there are transactions in the chunk
    // find ones associated with our two accounts
    const transactions = []
    chunkDetails.map(chunk => {
        chunk.transactions.map(txs => {
            if (txs.signer_id.includes(`oracle-node.${nearAcct}`)) {
                transactions.push(txs);
            }
        });
    });

    // we want to exclude transactions from the oracle-node
    // so we return only transactions that contain these two methods
    const matchingTxs = transactions.reduce((acc, curr) => {
        curr.actions.map(action => {
            if (action.FunctionCall.method_name === "fulfill_request") {

                const args = action.FunctionCall.args;
                const base64DecodedArgs = Buffer.from(args, 'base64');
                const jsonArgs = JSON.parse(base64DecodedArgs.toString());
                if (jsonArgs.nonce === nonce) {
                    acc.push(curr);
                }
            }
        });
        return acc;
    }, [])
    // Note: at this point should be only one transaction

    //insert initial transaction into matchingTxs array
    matchingTxs.push(global.firstTransaction)
    matchingTxs.push(global.secondTransaction)

    //transaction receipts from other steps
    const txObj = await getTransaction(matchingTxs[0].hash, 'oracle-node');
    await getReceiptsFromAccountPrefix(txObj, 'client', 6)

    //creates transaction links from matchingTxs
    const txsLinks = matchingTxs.map(txs => (({
        method: txs.actions[0].FunctionCall.method_name,
        link: `https://explorer.testnet.near.org/transactions/${txs.hash}`
    })));
    return txsLinks
}

const formatResult = function formatResult(result) {
    const price = result
    return `${Number(price)
            .toFixed(8)
            .toString()
        //   .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        }`
}

const getFormattedNonce = function getFormattedNonce(result) {
    return atob(result.status.SuccessValue)
        .replace(/['"]+/g, '')
}

const convertArgs = function convertArgs(tokenSymbol, CUR = 'USD') {
    const URL = 'https://min-api.cryptocompare.com/data/price?fsym='
    const obj = {
        get: `${URL}${tokenSymbol}&tsyms=${CUR}`,
        path: 'USD',
        times: 100
    }
    return btoa(JSON.stringify(obj))
}


const callClient = async function callClient(searchValue) {
    const clientAcct = await getClientAcct()
    const tokenSearch = convertArgs(searchValue.toUpperCase())
    return await clientAcct.functionCall(
        `client.${nearAcct}`,
        'get_token_price',

        // {
        //     payment: "10",
        //     spec_id: "dW5pcXVlIHNwZWMgaWQ=",
        //     "callback_address": "client.'$NEAR_ACCT'",
        //     "callback_method": "token_price_callback",
        //     "nonce": "1",
        //     "data_version": "1",
        //     "data": tokenSearch
        //   },

        {
            symbol: tokenSearch,
            spec_id: "ZDJjOWY5MjE4N2YyNGVjMDk1N2NmNTAyMGMwN2FmZGE="
        },
        '300000000000000'
    )
}

// near call client.$NEAR_ACCT get_token_price '{"symbol": "eyJnZXQiOiJodHRwczovL21pbi1hcGkuY3J5cHRvY29tcGFyZS5jb20vZGF0YS9wcmljZT9mc3ltPUVUSCZ0c3ltcz1VU0QiLCJwYXRoIjoiVVNEIiwidGltZXMiOjEwMH0=", "spec_id": "dW5pcXVlIHNwZWMgaWQ="}' --accountId client.$NEAR_ACCT --gas 300000000000000
// near call oracle.$NEAR_ACCT fulfill_request '{"account": "client.'$NEAR_ACCT'", "nonce": "35", "data": "MTAyNA=="}' --accountId oracle-node.$NEAR_ACCT --gas 300000000000000

const fulfillRequest = async function fulfillRequest(apiResponseData, nonce) {
    const oracleAcct = await getOracleAcct()
    console.log(oracleAcct)
    console.log(apiResponseData)
    console.log(nonce)
    return await oracleAcct.functionCall(
        `oracle.${nearAcct}`,
        'fulfill_request', {
        account: `client.${nearAcct}`,
        nonce: nonce,
        data: apiResponseData,
    },

        '300000000000000'
    )
}

const getAPIResponse = async function getAPIResponse(aggValue, datasetCodeValue, selectedBandValue, startDateValue, endDateValue, imageScaleValue, geometryValue) {
    try {

        console.log('Geometry: ', JSON.parse(geometryValue))
        const URL = 'https://geoapi-development-dot-shamba-dynamic-geoapi.ey.r.appspot.com/geoapi/v1/statistics'

        const data = {
            "dataset_code": datasetCodeValue,
            "selected_band": selectedBandValue,
            "geometry": JSON.parse(geometryValue),
            "start_date": startDateValue,
            "end_date": endDateValue,
            "image_scale": imageScaleValue
        }
        var res = await axios.post(URL, data

            // {
            // headers: {
            //     'Access-Control-Allow-Origin': '*',
            //     'Access-Control-Allow-Methods': 'POST',
            //     'Access-Control-Allow-Headers': 'Content-Type',
            //     'Access-Control-Max-Age': 86400
            // },
            //data
            //}

        )

        console.log(res.data['data'])

        return btoa(res.data['data'][aggValue].toString())



    } catch (error) {
        console.log(error)
    }

    return btoa('0')
}

const getReceivedVal = async function getReceivedVal(nonce) {
    const clientAcct = await getClientAcct()
    return await clientAcct.viewFunction(
        `client.${nearAcct}`,
        'get_received_val', { nonce: nonce.toString() }
    )
}

//NEAR-LINK view functions
const getAccountBalance = function getAccountBalance(acct) {
    global.nearLinkContract
        .get_balance({
            owner_id: acct
        })
        .then(result =>
            console.log(`${acct} balance: `, result))
}

const getAllowance = function getAllowance(baseAcct) {
    global.nearLinkContract
        .get_allowance({
            owner_id: `client.${baseAcct}`,
            escrow_account_id: `oracle.${baseAcct}`
        })
        .then(result =>
            console.log(`oracle.${baseAcct} allowance: `, result)
        )
}

//Oracle view functions
const isOracleAuthorized = function isOracleAuthorized(baseAcct) {
    global.oracleContract
        .is_authorized({
            node: `oracle-node.${baseAcct}`
        })
        .then(result =>
            console.log('oracle authorized? ', result))
}

const getOracleRequestSummary = function getOracleRequestSummary() {
    global.oracleContract
        .get_requests_summary({
            max_num_accounts: '10'
        })
        .then(result =>
            console.log('oracle request summary: ', result))
}

const getOracleRequests = function getOracleRequests(baseAcct) {
    global.oracleContract
        .get_requests({
            account: `client.${baseAcct}`,
            max_requests: "10"
        })
        .then(result => console.log(result))
}

const checkWithdrawableTokens = function checkWithdrawableTokens() {
    global.oracleContract
        .get_withdrawable_tokens()
        .then(result =>
            console.log('withdrawable tokens amt: ', result))
}

module.exports = {
    getLatestBlockID,
    getBlockByHash,
    getBlockByID,
    getReceiptsFromAccountPrefix,
    getTransaction,
    getTransactions,
    formatResult,
    getFormattedNonce,
    convertArgs,
    callClient,
    fulfillRequest,
    getAPIResponse,
    getReceivedVal,
    getAccountBalance,
    getAllowance,
    isOracleAuthorized,
    getOracleRequestSummary,
    getOracleRequests,
    checkWithdrawableTokens,
}

