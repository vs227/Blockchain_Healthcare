import hre from "hardhat";

async function main() {
  console.log("Deploying HealthcareRecords to", hre.network.name, "...");

  const HealthcareRecords = await hre.ethers.deployContract("HealthcareRecords");
  await HealthcareRecords.waitForDeployment();

  const address = await HealthcareRecords.getAddress();
  console.log(`\n✅ HealthcareRecords deployed to: ${address}`);
  console.log(`\nAdd this to your frontend .env:`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);

  // Wait for confirmations on testnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await HealthcareRecords.deploymentTransaction().wait(3);
    console.log("Confirmed! You can verify at:");
    console.log(`https://sepolia.etherscan.io/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
