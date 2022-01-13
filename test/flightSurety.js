
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var Web3 = require('web3');
var web3 = new Web3('HTTP://127.0.0.1:7545');

// var web3_eth = require('web3-eth');
// console.log(Web3.version);

contract('Flight Surety Tests', async (accounts) => {

  var config;
  console.log("Starting");
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    //console.log(config.flightSuretyApp.address);
    //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  console.log("Moving to tests");
  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let firstAirline = accounts[1]
    let newAirline = accounts[2];

    // ACT
    try {
        //await config.flightSuretyApp.registerAirline({from: newAirline});
        // await config.flightSuretyData.airlinePayAnte({
        //                                             from: newAirline,
        //                                             value:web3.utils.toWei("11", "ether")})

        await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('Airline can pay the ante', async () => {
    
    // ARRANGE
    //let newAirline = accounts[2];
    let firstAirline = accounts[1]
    var firstAirlineBalance = await web3.eth.getBalance(firstAirline)
    firstAirlineBalance = parseInt(firstAirlineBalance)



    
    await config.flightSuretyData.airlinePayAnte({
                                                    from: firstAirline,
                                                    value: web3.utils.toWei("11", "ether")})


    var is_paid = await config.flightSuretyData.isPaid({from: firstAirline})

        
   
    const balance_now = parseInt(await web3.eth.getBalance(firstAirline))
    const diff = parseInt(web3.utils.toWei('10', "ether")) / (10**18)

    // round to avoid gas costs canceling out the differences
    const diff_now = Math.round((firstAirlineBalance - balance_now) / (10**18))

    assert.equal(diff_now, diff, "Airline account must pay the contract");
    assert.equal(is_paid, true, "Contract must register the airline as having paid");



  });

  it('Paid Airline can register', async () => {
    let firstAirline = accounts[1]
    let newAirline = accounts[2];
    var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})

    // await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline});
    // var is_airline = await config.flightSuretyData.isAirline(newAirline, {from: firstAirline})

    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(is_paid, true, "Contract must register the airline as having paid");


  });
 

});
