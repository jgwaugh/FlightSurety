
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
 
  it('Paid Airline is athorized', async () => {
    let firstAirline = accounts[1]
    let newAirline = accounts[2];

    var is_authorized = await config.flightSuretyData.isCallerAuthorized({from: firstAirline})


    // await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline});
    // var is_airline = await config.flightSuretyData.isAirline(newAirline, {from: firstAirline})

    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(is_authorized, true, "Contract must register the airline as having paid");


  });
 

  it('Paid Airline can register another airline', async () => {
    let firstAirline = accounts[1]
    let newAirline = accounts[2];
    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    
    var airline_count = await config.flightSuretyData.getAirlineCount({from:firstAirline})

    await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline})
    var is_registered = await config.flightSuretyData.isAirlineAuthorized(newAirline, {from: firstAirline})
    var airline_count2 = await config.flightSuretyData.getAirlineCount({from:firstAirline})


    // var is_airline = await config.flightSuretyData.isAirline(newAirline, {from: firstAirline})

    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(is_registered, true, "Paid airline cannot register new Airline");
    assert.equal(airline_count2 - airline_count, 1, "Airline count increments by 1");

  });

  it('Fifth Airline cannot be registered without voting', async () => {
    let firstAirline = accounts[1]
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];


    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    
    await config.flightSuretyApp.registerAirline(airline3, {from: firstAirline})
    await config.flightSuretyApp.registerAirline(airline4, {from: firstAirline})
    var airline_count = await config.flightSuretyData.getAirlineCount({from:firstAirline})
    await config.flightSuretyApp.registerAirline(airline5, {from: firstAirline})

    var is_registered1 = await config.flightSuretyData.isAirlineAuthorized(firstAirline, {from: firstAirline})
    var is_registered2 = await config.flightSuretyData.isAirlineAuthorized(airline2, {from: firstAirline})
    var is_registered3 = await config.flightSuretyData.isAirlineAuthorized(airline3, {from: firstAirline})
    var is_registered4 = await config.flightSuretyData.isAirlineAuthorized(airline4, {from: firstAirline})
    var is_registered5 = await config.flightSuretyData.isAirlineAuthorized(airline5, {from: firstAirline})
    



    // var is_airline = await config.flightSuretyData.isAirline(newAirline, {from: firstAirline})

    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(is_registered1, true, "1 airline is not registered");
    assert.equal(is_registered2, true, "2 airline is not registered");
    assert.equal(is_registered3, true, "3 airline is not registered");
    assert.equal(is_registered4, true, "4th airline is not registered");
    assert.equal(airline_count, 4, "Less than 4 airlines are registered by the time we get to 5")
    assert.equal(is_registered5, false, "5th airline is registered");
    



  });


  it('Airline Can Vote Once', async () => {
    let firstAirline = accounts[1]
    let newAirline = accounts[5];
    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    
    var airline_5_votes = await config.flightSuretyData.getVoteCounts(newAirline, {from:firstAirline})
    await config.flightSuretyData.voteOnAirline(newAirline, {from:firstAirline})
    var airline_5_votes2 = await config.flightSuretyData.getVoteCounts(newAirline, {from:firstAirline})


    
    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(airline_5_votes2 - airline_5_votes, 1, "Airline votes increments by more than one");

  });


  it('Airline Cannot Vote Twice', async () => {
    let firstAirline = accounts[1]
    let newAirline = accounts[5];
    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    
    var airline_5_votes = await config.flightSuretyData.getVoteCounts(newAirline, {from:firstAirline})
    await config.flightSuretyData.voteOnAirline(newAirline, {from:firstAirline})
    await config.flightSuretyData.voteOnAirline(newAirline, {from:firstAirline})
    var airline_5_votes2 = await config.flightSuretyData.getVoteCounts(newAirline, {from:firstAirline})


    
    // assert.equal(is_airline, true, "Contract has registered the airline as having paid");

    assert.equal(airline_5_votes2 - airline_5_votes, 0, "Airline votes twice");

  });

  it('Minority Vote Does not register Airline', async () => {
    let firstAirline = accounts[1]
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];

    await config.flightSuretyData.airlinePayAnte({
                                          from: airline2,
                                          value: web3.utils.toWei("11", "ether")})

    await config.flightSuretyData.airlinePayAnte({
                                          from: airline3,
                                          value: web3.utils.toWei("11", "ether")})
                                          
    await config.flightSuretyData.airlinePayAnte({
                                          from: airline4,
                                          value: web3.utils.toWei("11", "ether")})


    await config.flightSuretyData.voteOnAirline(airline5, {from:airline2})
    await config.flightSuretyApp.registerAirline(airline5, {from: firstAirline})
    var is_registered5 = await config.flightSuretyData.isAirlineAuthorized(airline5, {from: firstAirline})
    var airline_5_votes = await config.flightSuretyData.getVoteCounts(airline5, {from:firstAirline})




    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    
    assert.equal(airline_5_votes, 2, "5th airline does not have 2 votes")
    assert.equal(is_registered5, false, "5th airline is registered");
    



  });

  it('Majority Vote Registers Airline', async () => {
    let firstAirline = accounts[1]
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];


    await config.flightSuretyData.voteOnAirline(airline5, {from:airline3})
    var airline_5_votes = await config.flightSuretyData.getVoteCounts(airline5, {from:firstAirline})
    var airline_count = await config.flightSuretyData.getAirlineCount({from:firstAirline})


    await config.flightSuretyApp.registerAirline(airline5, {from: firstAirline})
    
    var is_registered5 = await config.flightSuretyData.isAirlineAuthorized(airline5, {from: firstAirline})
   


    // var is_paid = await config.flightSuretyApp.isPaid({from: firstAirline})
    // assert.equal(airline_count, 4, "Not 4 airlines registered")
    // assert.equal(airline_5_votes, 3, "5th airline does not have 3 votes")

    assert.equal(airline_count, 4, "Not 4 airlines registered")
    assert.equal(airline_5_votes, 3, "5th airline does not have 3 votes")
    assert.equal(is_registered5, true, "5th airline is not registered");
    



  });


 

 

});
