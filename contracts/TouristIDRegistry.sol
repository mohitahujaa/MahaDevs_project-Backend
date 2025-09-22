// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TouristIDRegistry {
    enum Role { Tourist, Guide, Authority, Admin }

    struct Tourist {
        bytes32 idHash;   // hash of tourist's digital ID
        Role role;        // role in ecosystem
        bool exists;
    }

    mapping(address => Tourist) private registry;
    address public owner;

    // Track registered DTIDs
    mapping(bytes32 => bool) public dtidRegistered;
    bytes32[] public dtidList;

    event TouristRegistered(address indexed user, bytes32 idHash, Role role);
    event RoleUpdated(address indexed user, Role newRole);
    event DTIDRegistered(address indexed registrar, bytes32 indexed dtid);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender; // contract deployer is owner
    }

    // Register a new tourist (or guide/authority)
    function registerUser(address _user, bytes32 _idHash, Role _role) public onlyOwner {
        require(!registry[_user].exists, "User already registered");
        registry[_user] = Tourist(_idHash, _role, true);
        emit TouristRegistered(_user, _idHash, _role);
    }

    // Update role of existing user
    function updateRole(address _user, Role _newRole) public onlyOwner {
        require(registry[_user].exists, "User not found");
        registry[_user].role = _newRole;
        emit RoleUpdated(_user, _newRole);
    }

    // Verify a tourist's ID hash
    function verifyUser(address _user, bytes32 _idHash) public view returns (bool) {
        if (!registry[_user].exists) return false;
        return registry[_user].idHash == _idHash;
    }

    // Get role of a user
    function getUserRole(address _user) public view returns (Role) {
        require(registry[_user].exists, "User not found");
        return registry[_user].role;
    }

    // Register a DTID hash
    function registerDTID(bytes32 _dtid) public onlyOwner {
        require(!dtidRegistered[_dtid], "DTID already registered");
        dtidRegistered[_dtid] = true;
        dtidList.push(_dtid);
        emit DTIDRegistered(msg.sender, _dtid);
    }

    // Verify if a DTID hash exists
    function verifyDTID(bytes32 _dtid) public view returns (bool) {
        return dtidRegistered[_dtid];
    }

    function totalDTIDs() public view returns (uint) {
        return dtidList.length;
    }

    function getDTID(uint index) public view returns (bytes32) {
        return dtidList[index];
    }
}
