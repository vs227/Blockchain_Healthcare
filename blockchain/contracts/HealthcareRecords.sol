// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HealthcareRecords
 * @dev Optimized for Hospital-managed records with Aadhaar-based identification.
 * Supports: Request/Approve flow, Doctor Whitelisting, and Hospital-only signing.
 */
contract HealthcareRecords {
    address public hospital;

    struct Access {
        uint40 expiry;
        bool granted;
    }

    struct Record {
        uint40 timestamp;
        string ipfsHash;
    }

    // Mapping: keccak256(aadhaar) -> list of medical records
    mapping(bytes32 => Record[]) public patientRecords;
    
    // Mapping: keccak256(aadhaar) -> doctor_address -> access status
    mapping(bytes32 => mapping(address => Access)) public doctorAccess;

    // Mapping: doctor_address -> isWhitelisted
    mapping(address => bool) public doctorWhitelist;

    // Mapping: keccak256(aadhaar) -> doctor_address -> isPending
    mapping(bytes32 => mapping(address => bool)) public pendingRequests;

    event RecordAdded(bytes32 indexed patientHash, string ipfsHash, uint timestamp);
    event AccessRequested(bytes32 indexed patientHash, address indexed doctor);
    event AccessGranted(bytes32 indexed patientHash, address indexed doctor, uint expiry);
    event AccessRevoked(bytes32 indexed patientHash, address indexed doctor);
    event DoctorWhitelisted(address indexed doctor, bool status);

    modifier onlyHospital() {
        require(msg.sender == hospital, "Not authorized: Only Hospital can sign");
        _;
    }

    constructor() {
        hospital = msg.sender;
    }

    function setDoctorWhitelist(address _doctor, bool _status) public onlyHospital {
        doctorWhitelist[_doctor] = _status;
        emit DoctorWhitelisted(_doctor, _status);
    }

    /**
     * @dev Doctor requests access to a patient's records using their Aadhaar hash.
     */
    function requestAccess(bytes32 _patientHash) public {
        require(doctorWhitelist[msg.sender], "Doctor not whitelisted");
        pendingRequests[_patientHash][msg.sender] = true;
        emit AccessRequested(_patientHash, msg.sender);
    }

    function approveAccess(bytes32 _patientHash, address _doctor, uint _expiry) public onlyHospital {
        require(pendingRequests[_patientHash][_doctor], "No pending request from this doctor");
        
        doctorAccess[_patientHash][_doctor] = Access({
            expiry: uint40(_expiry),
            granted: true
        });
        
        pendingRequests[_patientHash][_doctor] = false;
        emit AccessGranted(_patientHash, _doctor, _expiry);
    }

    function addMedicalRecord(bytes32 _patientHash, string memory _ipfsHash) public onlyHospital {
        patientRecords[_patientHash].push(Record({
            timestamp: uint40(block.timestamp),
            ipfsHash: _ipfsHash
        }));
        emit RecordAdded(_patientHash, _ipfsHash, block.timestamp);
    }

    function hasAccess(bytes32 _patientHash, address _doctor) public view returns (bool) {
        if (_doctor == hospital) return true;
        Access memory access = doctorAccess[_patientHash][_doctor];
        return access.granted && (access.expiry == 0 || block.timestamp < access.expiry);
    }

    function getPatientRecords(bytes32 _patientHash) public view returns (Record[] memory) {
        require(msg.sender == hospital || hasAccess(_patientHash, msg.sender), "Access denied");
        return patientRecords[_patientHash];
    }
}

