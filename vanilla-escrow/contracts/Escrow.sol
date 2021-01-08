// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract Escrow {
    address public depositor;
    address payable public beneficiary;
    address public arbiter;
    uint256 public value;

    constructor (address _arbiter, address payable _beneficiary) payable {
        arbiter = _arbiter;
        beneficiary = _beneficiary;
        depositor = msg.sender;
        // value = value;
    }

    function approve() public payable {
        require(msg.sender == arbiter,"Not arbiter.");
        beneficiary.transfer(address(this).balance);
    }
}
