pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    struct Airline {
        string id;
        bool isRegistered;
        bool isPaid;
        uint256 bonus;
        address wallet;
    }

    mapping(string => Airline) airlines; 
    mapping(address => uint256) public authorizedAirlines;
    mapping(address => uint256) public paidAirlines;
    mapping(address => mapping(address => uint256)) public voteTracker; //tracks which airlines have voted on which flights
    mapping(address => uint256) public  hasBeenVoted; //tracks if voteTracker has null values
    mapping(address => uint256) public voteCounts; //counts of votes
    mapping(address => mapping(bytes32 => uint256)) public insurance_purchases; //tracks how much insurance someone has bought
    mapping(bytes32 => address []) public flight_purchasees;
    
    mapping(bytes32 => uint256) public flight_status;
    mapping(address => uint256) public credit_owed;

    // mapping(address => uint256) public voteCounter;
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint256 public constant REGISTRATION_FEE = 10 ether;
    uint256 public constant MAX_INSURANCE_PRICE = 1 ether;
    uint256 public constant NO_CONSENSUS = 4;
    uint256 public n_airlines = 0;
    uint256 public votes_needed = 3;

    // 


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirline) 
                                public 
    {
        contractOwner = msg.sender;
        paidAirlines[firstAirline] = 0;
        authorizedAirlines[firstAirline] = 1;
        n_airlines = 1;


        // register the caller of the constructor
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed


    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerPaid()
    {
        require(isAirlinePaid(msg.sender), "Caller has not paid");
        _;
    }


    modifier requireIsAirlinePaid(address airline)
    {
        require(isAirlinePaid(airline), "Caller has not paid");
        _;
    }

     modifier requireNotAirlinePaid(address airline)
    {
        require(!isAirlinePaid(airline), "Caller has not paid");
        _;
    }


    modifier requireIsCallerAuthorized()
    {
        require(isAirlineAuthorized(msg.sender), "Caller has not been authorized - Data breaking");
        _;
    }

    modifier requireInsurancePriceLimited()
    {

        require(msg.value <= MAX_INSURANCE_PRICE, "Caller must pay <= 1 ether for insurace");
        _;
    }

    modifier requireIsAirlineAuthorized(address airline)
    {
        require(isAirlineAuthorized(airline), "Address has not been authorized - Data breaking");
        _;
    }

     modifier requireNotAirlineAuthorized(address airline)
    {
        require(!isAirlineAuthorized(airline), "Airline has been authorized");
        _;
    }

    modifier requireisFlightCancelled(bytes32 flight) {
        require(isFlightCancelled(flight), "Flight must be cancelled");
        _;
    }


    function isFlightCancelled(bytes32 flight) public view returns(bool)
        {
            return flight_status[flight]== 1;
        }

    function setFlightCancelled(bytes32 flight) public {
        flight_status[flight] = 1;
    }

    function isAirlinePaid(address airline) public view returns(bool) 
        {

            return paidAirlines[airline] == 1;
        }


    function isCallerAuthorized() public view 
                                 returns(bool)
        {
            return authorizedAirlines[msg.sender] == 1;
        }

    function isAirlineAuthorized(address airline) public view 
                                 returns(bool)
        {
            return authorizedAirlines[airline] == 1;
        }


    function isPaid() public view returns(bool) 
        {

            return paidAirlines[msg.sender] == 1;
        }


    

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    // votes on an airline to to 
    function voteOnAirline(address airline_vote
                            ) public 
                            requireIsOperational
                            requireIsCallerPaid
                            requireIsCallerAuthorized
                            requireNotAirlineAuthorized(airline_vote)

        {
            if (hasBeenVoted[airline_vote] == 0){
                hasBeenVoted[airline_vote] = 1;
                voteTracker[airline_vote][msg.sender] = 1;
                voteCounts[airline_vote] = voteCounts[airline_vote] +1; 
                


            } else {
                if (voteTracker[airline_vote][msg.sender] == 0){
                    voteTracker[airline_vote][msg.sender] = 1;
                    voteCounts[airline_vote] = voteCounts[airline_vote] +1; 

                }

            }


        }


    function getVoteCounts(address airline_vote)
                            public
                            view
                            requireIsOperational
                            returns(uint256 votes)
        {
            votes = voteCounts[airline_vote];
            return votes;

        }


    function airlinePayAnte ()
                    external
                    payable
                    requireIsOperational
                 

    {
        // check if the airline has already paid or not
        if(paidAirlines[msg.sender] != 1){
            if (msg.value >= REGISTRATION_FEE){

                paidAirlines[msg.sender] = 1;
            
            }

            // send back remaining
            if (msg.value > REGISTRATION_FEE){
                msg.sender.transfer(msg.value - REGISTRATION_FEE);
            }
        } else{
            msg.sender.transfer(msg.value);
        }

    }


// // external
  // requireIsCallerAuthorized
                            // requireIsCallerPaid
    function registerAirline( address airline,
                              address existing_airline

                            )
                            
                            external
                            requireIsOperational
                            requireIsAirlinePaid(existing_airline)
                            requireIsAirlineAuthorized(existing_airline)
                            requireNotAirlineAuthorized(airline)
                            returns(bool success, uint256 votes)

    
    {

        // bool success_val = false;
        // uint256 votes = 0;

        // check if we are in the initial stages
        if (n_airlines < NO_CONSENSUS){
            success = true;
        } else {
            votes = voteCounts[airline];
            
            if( votes >= votes_needed){
                success = true;

                if (n_airlines % 2 == 1){
                    votes_needed = votes_needed + 1;
                }

            }
        }

        if(success == true){
            n_airlines = n_airlines + 1;
            authorizedAirlines[airline] = 1;
            
        }
        return (success, votes);
    }


    function isAirline(address airline) 
                        public
                        requireIsOperational
                        view
                        returns(bool status)
            {
                status = authorizedAirlines[airline] == 1;
                return status;

            }

    function getAirlineCount()
                            public
                            view
                            requireIsOperational
                            returns(uint256 n_airlines_out)

                {
                    n_airlines_out = n_airlines;
                    return n_airlines_out;
                }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy ( address passenger,
                   address airline,
                   string flight,
                   uint256 timestamp                        
                )
                external
                requireIsOperational
                requireInsurancePriceLimited
                payable
    {
        bytes32 flight_key = getFlightKey(airline, flight, timestamp);
        insurance_purchases[passenger][flight_key] = msg.value;
        flight_purchasees[flight_key].push(passenger);



    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees( address airline,
                             string flight,
                             uint256 timestamp
                                )
                                external
                                requireIsOperational
                                requireisFlightCancelled(getFlightKey(airline, flight, timestamp)) 


    {
        
        bytes32 flight_key = getFlightKey(airline, flight, timestamp);
        // address[] flight_list = flight_purchasees[flight_key]; 

        for (uint i=0; i<flight_purchasees[flight_key].length; i++) {
            address passenger= flight_purchasees[flight_key][i];
            credit_owed[passenger] = credit_owed[passenger] + insurance_purchases[passenger][flight_key] *3 / 2;


    }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(
                address passenger
                ) external                  
        {
            passenger.transfer(credit_owed[passenger]);
        }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    // not to grader - my funding function is called "airline pay ante"
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

