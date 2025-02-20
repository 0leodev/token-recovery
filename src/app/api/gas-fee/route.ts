import { NextResponse } from "next/server"
import { ethers } from "ethers"

export async function GET() {
  try {
    const INFURA_URL = `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
    const provider = new ethers.JsonRpcProvider(INFURA_URL)

    // Fetch the current fee data (gas prices)
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits("50", "gwei") // Fallback if maxFeePerGas is null
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("1", "gwei") // Fallback if maxPriorityFeePerGas is null

    // Calculate the dynamic gas fee for the sponsor transaction
    const gasLimit = 80000 // Gas limit for the transaction
    const gasFee = BigInt(gasLimit) * (maxFeePerGas + maxPriorityFeePerGas) // Total gas fee in wei
    const gasFeeInEth = ethers.formatEther(gasFee) // Convert gas fee to ETH

    return NextResponse.json({ gasFeeInEth }, { status: 200 })
  } catch (error) {
    console.error("Error calculating gas fee:", error)
    return NextResponse.json({ error: "Failed to calculate gas fee" }, { status: 500 })
  }
}

