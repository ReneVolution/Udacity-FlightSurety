pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    FlightSuretyData flightSuretyData;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract

    // Constants
    uint256 private INSURANCE_MAX_VOLUME = 1 ether;
    uint8 private INSURANCE_MULTIPLIER = 3;
    uint8 private INSURANCE_DIVIDER = 2;

    uint256 public AIRLINE_MIN_FUNDING_DEPOSIT = 10 ether;
    uint8 private AIRLINE_ACCEPT_THRESHOLD = 4;
    uint8 private AIRLINE_MIN_VOTES = 2;

    // Multiparty
    uint8 private constant MULTIPARTY_MIN_AIRLINES = 4;
    uint256 public airlinesCount;

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
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineIsFunded() {
        require(flightSuretyData.getAirlineFunds(msg.sender) >= AIRLINE_MIN_FUNDING_DEPOSIT, 'Airline is missing funding.');
        _;
    }

    modifier requireAirlineIsUnique(address _airlineAddress) {
        require(flightSuretyData.isAirline(_airlineAddress) == false, 'Airline already exists.');
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address fsDataContract) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(fsDataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return flightSuretyData.isOperational();
    }

    function setOperatingStatus(bool status) public {
        flightSuretyData.setOperatingStatus(status);
    }

    function getAirlines() public view returns(address[]) {
        return flightSuretyData.getAirlines();
    }

    function getAirlineData(address _airlineAddress) public view returns(string, address, string, uint256, uint8) {
        return flightSuretyData.getAirlineData(_airlineAddress);
    }
    
    function getAirlineStatus(address _airlineAddress) public view returns(string) {
        return flightSuretyData.getReadableAirlineStatus(_airlineAddress);
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function addAirline(string name, address _address)
        public
        // returns (bool success, uint256 votes)
        requireAirlineIsFunded
        requireAirlineIsUnique(_address)
    {
        flightSuretyData.nominateAirline(msg.sender, name, _address);
        if(flightSuretyData.getAirlines().length <= MULTIPARTY_MIN_AIRLINES) {
            flightSuretyData.registerAirline(_address);
        }
    }

    function approveAirline(address _address) public requireAirlineIsFunded {
        uint8 numApprovers = flightSuretyData.approveAirline(msg.sender, _address);
        // If conesensus is reached, register airline
        if (numApprovers >= airlinesCount.div(2)) {
            flightSuretyData.registerAirline(_address);
        }
        
    }

    function addFunds() public payable {
        flightSuretyData.fund.value(msg.value)(msg.sender);
        flightSuretyData.setAirlineFundingStatusByThreshold(msg.sender, AIRLINE_MIN_FUNDING_DEPOSIT);
    }

    function getFlights() external view returns (bytes32[]) {
        return flightSuretyData.getFlights();
    }

    function getFlightData(bytes32 flightKey) external view returns(address, string, uint256, uint8, bool) {
        return flightSuretyData.getFlightData(flightKey);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(address _airlineAddress, string _flightCode, uint256 _scheduledTimestamp) public requireAirlineIsFunded {
        flightSuretyData.registerFlight(_airlineAddress, _flightCode, _scheduledTimestamp, STATUS_CODE_UNKNOWN);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        flightSuretyData.setFlightStatus(airline, flight, timestamp, statusCode);
        if(statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(airline, flight, timestamp);
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    function buyFlightInsurance(
        address airline,
        string flight,
        uint256 timestamp
        ) public payable {
            require(msg.value <= INSURANCE_MAX_VOLUME, "Exceeding max insurance volume.");
            uint256 currentInsuranceValue = flightSuretyData.getInsuranceBalance(msg.sender, airline, flight, timestamp);
            require(msg.value + currentInsuranceValue <= INSURANCE_MAX_VOLUME, "Cummulative insurance volume exceeds allowed max value.");
            flightSuretyData.buy.value(msg.value)(msg.sender, airline, flight, timestamp, INSURANCE_MULTIPLIER, INSURANCE_DIVIDER);
        }

    function getWithdrawableBalance() public view returns(uint256){
        return flightSuretyData.getWithdrawableBalance(msg.sender);
    }

    function claimRefunds() public {
        uint256 eligibleAmount = flightSuretyData.getWithdrawableBalance(msg.sender);
        flightSuretyData.pay(msg.sender, eligibleAmount);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
