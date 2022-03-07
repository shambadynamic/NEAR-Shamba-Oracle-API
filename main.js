require('dotenv').config()

// disable logging
// console.log = (...a) => {}

global.nearSteps = {}

const {
  callClient,
  formatResult,
  getFormattedNonce,
  getLatestBlockID,
  getTransactions,
  getReceivedVal,
  getTransaction,
  getReceiptsFromAccountPrefix,
  getAPIResponse,
  fulfillRequest
} = require('./contractUtils');

const express = require('express')
const app = express()
const port = 4000
var cors = require('cors')
app.use(cors())
app.use(express.json())

var searchValue = "agg_max";
var datasetCodeValue = "COPERNICUS/S2_SR";
var selectedBandValue = "NDVI";
var startDateValue = "2021-09-01";
var endDateValue = "2021-09-10";
var imageScaleValue = 250;
var geometryValue = JSON.stringify({"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[19.51171875,4.214943141390651],[18.28125,-4.740675384778361],[26.894531249999996,-4.565473550710278],[27.24609375,1.2303741774326145],[19.51171875,4.214943141390651]]]}}]});


const run = async () => {
  const result = await callClient(searchValue);
  const firstTransactionHash = result.transaction.hash;
  console.log('First transaction hash: ', firstTransactionHash)
  const txObj = await getTransaction(firstTransactionHash, 'client');
  await getReceiptsFromAccountPrefix(txObj, 'oracle', 2);
  global.firstTransaction = result.transaction;
  const firstBlockID = result.transaction_outcome.block_hash;
  const requestNonce = getFormattedNonce(result);

  console.log('Request Nonce: ', requestNonce);

  const final_result = await fetchNonceAnswer(firstBlockID, requestNonce);

  console.log(final_result);

  return final_result;
}

const fetchNonceAnswer = async (firstBlockID, nonce) => {
  let apiResponse = await getAPIResponse(searchValue, datasetCodeValue, selectedBandValue, startDateValue, endDateValue, imageScaleValue, geometryValue)
  const txResut = await fulfillRequest(apiResponse, nonce)
  const secondTransactionHash = txResut.transaction.hash;
  console.log('Second transaction hash: ', secondTransactionHash)
  const txObj = await getTransaction(secondTransactionHash, 'oracle');
  await getReceiptsFromAccountPrefix(txObj, 'client', 6);
  global.secondTransaction = txResut.transaction;
  let result = await getReceivedVal(nonce);
  console.log('Checking for result...');

  if (result !== '-1') {
    const agg_value = result;
    result = formatResult(result);
    const finalBlockID = await getLatestBlockID();
    console.log('setSearchResult => ',result);
    console.log('FIRST block ID: ', firstBlockID);
    console.log('LAST block ID: ', finalBlockID);

    global.transactions = await getTransactions(firstBlockID, finalBlockID, nonce)
    // dispatch({ type: 'displayDiagram' });

    console.log('STEPS: ', global.nearSteps);
    //console.log('Transaction Links: ', global.transactions);

    return { "result_type": searchValue, "result": agg_value, "transactions": [global.transactions[0].link, global.transactions[1].link] };

  } else setTimeout(async () => {
    await fetchNonceAnswer(firstBlockID, nonce);
  }, 750);
}

function empty(v) {
  if (!v || v === '') {
    return true
  }
}

app.post('/', (req, res) => {

  searchValue = req.body.searchValue;
  datasetCodeValue = req.body.datasetCodeValue;
  selectedBandValue = req.body.selectedBandValue;
  startDateValue = req.body.startDateValue;
  endDateValue = req.body.endDateValue;
  imageScaleValue = req.body.imageScaleValue;
  geometryValue = req.body.geometryValue;

  res.set('Content-Type', 'application/json')

  if (
    empty(searchValue) ||
    empty(datasetCodeValue) ||
    empty(selectedBandValue) ||
    empty(startDateValue) ||
    empty(endDateValue) ||
    empty(imageScaleValue) ||
    empty(geometryValue)
  ) {
    return res.status(400).end({msg:'you must fill all variables'})
  }

  run().then(data => {
    res.status(200).end(JSON.stringify(data));
  }).catch(e => {
    res.status(200).end({msg:'error',e})
  })
})

app.use((req,res,next) => {
  res.status(404).send('404| NOT FOUND!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
