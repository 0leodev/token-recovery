import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    if (data.result && data.result.ethusd) {
      return NextResponse.json({ ethPriceInUsd: data.result.ethusd }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Failed to fetch ETH price" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}