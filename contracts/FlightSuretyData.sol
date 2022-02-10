pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    bool private operational = true; // Blocks all state changes throughout the contract if false

    // Access control variables
    address private contractOwner; // Account used to deploy contract
    mapping(address => bool) private authorizedCallers; // Contract Owner and Funded Airlines to be authorized

    address[] private airlines;
    mapping(address => Airline) private airlineData;

    bytes32[] private flights;
    mapping(bytes32 => Flight) private flightsData;

    mapping(address => uint256) private availableWithdrawals;

    struct Airline {
        string name;
        address airlineAddress;
        AirlineStatus status;
        uint256 funds;
        mapping(address => bool) approvers;
        uint8 numApprovers;
    }

    struct Flight {
      string flightCode;
      uint8 statusCode;
      uint256 scheduledTimestamp;
      address airlineAddress;
      mapping(address => Insurance) insurances;
      address[] insurees;
      bool isProcessed;
    }

    struct Insurance {
        address ownerAddress;
        uint256 value;
        uint8 multiplier;
        uint8 divider;
    }

    enum AirlineStatus {
        New,
        Nominated,
        Registered,
        Funded
    }

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(string _airlineName, address _airlineAddress) public {
        contractOwner = msg.sender;
        authorizedCallers[msg.sender] = true; // Ensure contractOwner is authorized

        // First airline should automatically be registered
        nominateAirline(contractOwner, _airlineName, _airlineAddress);
        registerAirline(_airlineAddress);
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // event AirlineRegistered(address indexed airlineAddress);
    // event AirlineFunded(address airlineAddress);

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
        require(operational == true, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the caller to be authorized
     */
    modifier requireAuthorizedCaller() {
        require(
            authorizedCallers[msg.sender] == true,
            "Caller is not authorized"
        );
        _;
    }

    modifier requireAirlineIsRegistered(address _airlineAddress) {
        require(airlineData[_airlineAddress].status >= AirlineStatus.Registered);
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() external view requireAuthorizedCaller returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireAuthorizedCaller {
        operational = mode;
    }

    function authorizeCaller(address _address)
        external
        requireIsOperational
        requireContractOwner
    {
        authorizedCallers[_address] = true;
    }

    function deauthorizeCaller(address _address)
        external
        requireIsOperational
        requireContractOwner
    {
        authorizedCallers[_address] = false;
    }

    function isAuthorized(address _address) external view requireIsOperational returns (bool) {
        return authorizedCallers[_address];
    } 

    function isAirline(address _address)
        public
        view
        requireIsOperational
        requireAuthorizedCaller
        returns (bool)
    {
        return airlineData[_address].airlineAddress > address(0);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function getAirlines() public view returns(address[]) {
        return airlines;
    }

    function getAirlineData(address _airlineAddress) public view returns(string, address, string, uint256, uint8) {
        Airline storage _airlineData = airlineData[_airlineAddress];
        return (_airlineData.name ,_airlineData.airlineAddress, getReadableAirlineStatus(_airlineAddress), _airlineData.funds, _airlineData.numApprovers);
    }

    function nominateAirline(address _from, string _name, address _airlineAddress)
        public
        requireIsOperational
        requireAuthorizedCaller
        returns(string, address, string, uint256, uint8)
    {
        // TODO: require not being nominated before
        airlineData[_airlineAddress] = Airline(
            _name,
            _airlineAddress,
            AirlineStatus.New,
            0, // No funding when started
            0
        );

        airlines.push(_airlineAddress);

        // Whoever nominates an airline also approves it initially
        approveAirline(_from, _airlineAddress);

        return getAirlineData(_airlineAddress);
    }

    function approveAirline(address _from, address _airlineAddress)
        public
        requireIsOperational
        requireAuthorizedCaller
        returns (uint8)
    {
        // Ensure each Airline has only a single vote for approval per airline
        require(
            airlineData[_airlineAddress].approvers[_from] != true,
            "Vote ignored. You only have a single vote per Airline."
        );
        airlineData[_airlineAddress].approvers[_from] = true;
        airlineData[_airlineAddress].numApprovers++;

        return airlineData[_airlineAddress].numApprovers;
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address _airlineAddress)
        public
        requireIsOperational
        requireAuthorizedCaller
    {
        airlineData[_airlineAddress].status = AirlineStatus.Registered;
    }

    function getReadableAirlineStatus(address _airlineAddress) public view returns(string) {
        AirlineStatus _status = getAirlineStatus(_airlineAddress);

        if (AirlineStatus.New == _status) return "New";
        if (AirlineStatus.Nominated == _status) return "Nominated";
        if (AirlineStatus.Registered == _status) return "Registered";
        if (AirlineStatus.Funded == _status) return "Funded";

        // else
        return "Unknown";
    }

    function getAirlineStatus(address _airlineAddress)
        internal
        view
        requireIsOperational
        requireAuthorizedCaller
        returns (AirlineStatus)
    {
        return airlineData[_airlineAddress].status;
    }

    function setAirlineStatus(address _airlineAddress, AirlineStatus status)
        internal
        requireIsOperational
        requireAuthorizedCaller
    {
        airlineData[_airlineAddress].status = status;
    }

    function getAirlineFunds(address _airlineAddress)
        public
        view
        requireIsOperational
        requireAuthorizedCaller
        returns (uint256)
    {
        return airlineData[_airlineAddress].funds;
    }

    function setAirlineFundingStatusByThreshold(address _airlineAddress, uint256 fundingThreshold) external {
        uint256 currentFunds = getAirlineFunds(_airlineAddress);
        if(currentFunds >= fundingThreshold) {
            setAirlineStatus(_airlineAddress, AirlineStatus.Funded);
        } else {
            setAirlineStatus(_airlineAddress, AirlineStatus.Registered);
        }
    }

    /** Flight Functions */

    function getFlights() external view requireIsOperational returns(bytes32[]) {
      return flights;
    }

  

    function getFlightData(bytes32 key) external view requireIsOperational returns(address, string, uint256, uint8, bool) {
          Flight memory flight = flightsData[key];

          return (flight.airlineAddress, flight.flightCode, flight.scheduledTimestamp, flight.statusCode, flight.isProcessed);
        }

    function registerFlight(
        address _airlineAddress,
        string _flightCode,
        uint256 _timestamp,
        uint8 _statusCode
    ) external requireIsOperational {
        bytes32 key = getFlightKey(_airlineAddress, _flightCode, _timestamp);
        require(
            flightsData[key].airlineAddress == address(0),
            "Flight is already registered"
        );
        
        flightsData[key] = Flight(
            _flightCode,
            _statusCode,
            _timestamp,
            _airlineAddress,
            new address[](0),
            false
        );

        flights.push(key);
    }

    function setFlightStatus(      
        address _airlineAddress,
        string _flightCode,
        uint256 _timestamp,
        uint8 _statusCode 
    ) external requireIsOperational requireAuthorizedCaller {
        bytes32 flightKey = getFlightKey(_airlineAddress, _flightCode, _timestamp);
        require(
            flightsData[flightKey].airlineAddress != address(0),
            "Flight is not registered"
        );

        flightsData[flightKey].statusCode = _statusCode;
    }

    function getInsuranceBalance(address _insuree, address _airline, string _flightCode, uint256 _timestamp) public requireIsOperational
        requireAuthorizedCaller returns(uint256) {
        bytes32 flightKey = getFlightKey(_airline, _flightCode, _timestamp);
        return flightsData[flightKey].insurances[_insuree].value;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address _from,
        address airline,
        string flightCode,
        uint256 timestamp,
        uint8 multiplier,
        uint8 divider
    ) external payable {
        bytes32 flightKey = getFlightKey(airline, flightCode, timestamp);
        require(
            flightsData[flightKey].airlineAddress != address(0),
            "Flight is not registered"
        );
        Insurance memory currentInsurance = flightsData[flightKey].insurances[
            _from
        ];

        if (currentInsurance.ownerAddress == address(0)) {
            // a new insurance
            Insurance memory newInsurance = Insurance(
                _from,
                msg.value,
                multiplier,
                divider
            );
            flightsData[flightKey].insurances[_from] = newInsurance;
            flightsData[flightKey].insurees.push(_from);
        } else {
            // an existing insurance
            flightsData[flightKey].insurances[_from].value = currentInsurance.value + msg.value;
        }
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(address airline, string flightCode, uint256 timestamp)
        external
        requireIsOperational
        requireAuthorizedCaller
    {
        bytes32 flightKey = getFlightKey(airline, flightCode, timestamp);

        require(
            !flightsData[flightKey].isProcessed,
            "Flight is already processed."
        );

        Flight storage flight = flightsData[flightKey];

        for (uint256 i = 0; i < flight.insurees.length; i++) {
            address insuranceOwner = flight.insurees[i];
            Insurance memory curInsurance = flight.insurances[insuranceOwner];
            uint256 insuranceValue = curInsurance.value;

            uint256 insuranceRefund = insuranceValue
                .mul(curInsurance.multiplier)
                .div(curInsurance.divider);
            availableWithdrawals[
                curInsurance.ownerAddress
            ] = availableWithdrawals[curInsurance.ownerAddress].add(
                insuranceRefund
            );

            airlineData[flight.airlineAddress].funds.sub(insuranceRefund);
        }

        flight.isProcessed = true;
    }

    function getWithdrawableBalance(address _from)
        external
        view
        requireIsOperational
        returns (uint256)
    {
        return availableWithdrawals[_from];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address insuranceOwnerAddress, uint256 amount)
        external
        payable
        requireIsOperational
        requireAuthorizedCaller
    {
        require(
            availableWithdrawals[insuranceOwnerAddress] > 0,
            "Nothing to withdraw."
        );

        require(
            amount <= availableWithdrawals[insuranceOwnerAddress],
            "Requested amount exceeds eligible amount."
        );
        availableWithdrawals[insuranceOwnerAddress] = availableWithdrawals[
            insuranceOwnerAddress
        ].sub(amount);
        insuranceOwnerAddress.transfer(amount);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address _from)
        public
        payable
        requireIsOperational
        requireAirlineIsRegistered(_from)
        returns(uint256)
    {
        uint256 currentFunds = airlineData[_from].funds;
        airlineData[_from].funds = currentFunds.add(msg.value);

        return airlineData[_from].funds;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund(msg.sender);
    }
}
