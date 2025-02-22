"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"

export default function Home() {
  const [sponsorKey, setSponsorKey] = useState("")
  const [compromisedKey, setCompromisedKey] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState("")
  const [gasFeeInEth, setGasFeeInEth] = useState("")
  const [ethPriceInUsd, setEthPriceInUsd] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [highlight, setHighlight] = useState(false)
  const [network, setNetwork] = useState("mainnet") // Default to Ethereum Mainnet
  const prevGasFeeRef = useRef(gasFeeInEth)

  useEffect(() => {
    const fetchGasFee = async () => {
      try {
        const response = await fetch(`/api/gas-fee?network=${network}`)
        const data = await response.json()
        if (data.gasFeeInEth) {
          const originalGasFee = Number.parseFloat(data.gasFeeInEth)
          const reducedGasFee = originalGasFee * 1.7
          const newGasFee = reducedGasFee.toFixed(8)
          if (newGasFee !== prevGasFeeRef.current) {
            setGasFeeInEth(newGasFee)
            setHighlight(true)
            prevGasFeeRef.current = newGasFee
          }
        }
      } catch (error) {
        console.error("Error fetching gas fee:", error)
      }
    }

    const fetchEthPrice = async () => {
      try {
        const response = await fetch("/api/eth-price")
        const data = await response.json()
        if (data.ethPriceInUsd) {
          setEthPriceInUsd(data.ethPriceInUsd)
        }
      } catch (error) {
        console.error("Error fetching ETH price:", error)
      }
    }

    fetchGasFee()
    fetchEthPrice()
    const intervalId = setInterval(fetchGasFee, 10000)
    return () => clearInterval(intervalId)
  }, [network])

  useEffect(() => {
    if (highlight) {
      const timer = setTimeout(() => setHighlight(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [highlight])

  useEffect(() => {
    const savedStatus = localStorage.getItem("transactionStatus")
    if (savedStatus) {
      setStatus(savedStatus)
      if (savedStatus.startsWith("Transaction submitted") || savedStatus.startsWith("Waiting for inclusion")) {
        pollStatus()
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("transactionStatus", status)
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus("Transaction submitted. Waiting for inclusion in a block...")

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sponsorKey,
          compromisedKey,
          tokenAddress,
          recipientAddress,
          amount,
          network,
        }),
      })

      const data = await response.json()
      setStatus(data.status)
      pollStatus()
    } catch (error) {
      console.error(error)
      setStatus("Error submitting transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/run", { method: "GET" })
      const data = await response.json()
      setStatus(data.status)
      if (data.status.startsWith("Success")) {
        clearInterval(interval)
      }
    }, 5000)
  }

  const gasFeeInUsd = (Number(gasFeeInEth) * Number(ethPriceInUsd)).toFixed(2)

  return (
    <div className="min-h-screen p-2 bg-gray-900">
      <h1 className="text-3xl font-bold mb-0 mt-3 text-center text-accent">Token Recovery</h1>
      <h2 className="text-1xl mb-4 text-gray-400 mt-1 text-center text-accent">Recover tokens from wallets compromised by sweeping bots using flashbots in a simple way.</h2>
    <div className="max-w-2xl mx-auto mb-4 p-6 bg-gradient-to-b from-yellow-950/20 to-yellow-900/10 text-yellow-100 rounded-xl border border-yellow-600/30 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-yellow-300">Caution</h2>
          <p className="text-yellow-100/90 leading-relaxed">
          It is advisable to run this application on a device that does not contain cryptocurrencies or sensitive
          information, to prevent losses in a possible attack.
          </p>
        </div>
      </div>
    </div>

      <div className="max-w-2xl mx-auto bg-gray-800 p-4 rounded-xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Network:</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full bg-gray-800 text-foreground border border-gray-600 rounded-md p-2"
            >
              <option value="mainnet">Ethereum Mainnet</option>
              <option value="sepolia">Sepolia Testnet</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-semibold">Sponsor Private Key:</label>
            <input
              type="text"
              value={sponsorKey}
              onChange={(e) => setSponsorKey(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Compromised Private Key:</label>
            <input
              type="text"
              value={compromisedKey}
              onChange={(e) => setCompromisedKey(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Token Contract Address:</label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Recipient Address:</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Amount to Transfer:</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full" />
          </div>
          <button type="submit" className="w-full py-3 text-lg font-semibold" disabled={isLoading}>
            {isLoading ? "Processing..." : "Run Recovery"}
          </button>
        </form>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="bg-secondary p-4 rounded-md flex items-start space-x-3">
            {status.startsWith("Success") ? (
              <CheckCircle className="text-green-500 mt-1" />
            ) : (
              <AlertCircle className="text-yellow-500 mt-1" />
            )}
            <p className="flex-1">{status}</p>
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Estimated Gas Cost</h2>
          <p className={`text-2xl font-bold text-accent p-2 ${highlight ? "highlight-change" : ""}`}>{gasFeeInEth} ETH</p>
          <p className="text-lg text-gray-400">≈ ${gasFeeInUsd} USD</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto mt-4 bg-gray-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Information</h2>
        <ul className="list-disc pl-5 space-y-3 text-gray-300">
          <li>This service costs <span className="font-bold">10%</span> of the total tokens recovered.</li>
          <li>The <span className="font-bold">Sponsor Private Key</span> is the wallet that will pay the gas for the transaction. It is recommended to use a wallet created solely for this purpose and not a personal-use wallet.</li>
          <li>The <span className="font-bold">Compromised Private Key</span> is the wallet contaminated by sweeper bots that instantly withdraw ETH as soon as it is deposited.</li>
          <li>The <span className="font-bold">Token Contract Address</span> is the contract of the token you want to recover.</li>
          <li>The <span className="font-bold">Recipient Address</span> is the wallet address where you want to receive the recovered tokens.</li>
          <li>The <span className="font-bold">Amount to Transfer</span> is the amount of the token you want to recover. Make sure to transfer everything.</li>
          <li>Make sure you have enough gas to pay for the transaction.</li>
          <li>If you want, you can test the transaction on <span className="font-bold">Sepolia</span> to ensure it works.</li>
        </ul>
      </div>
      <div className="max-w-2xl mx-auto mt-8 pb-8 text-center">
        <a
          href="https://x.com/0xleo_dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
        >
          Developed by @0xleo_dev
        </a>
      </div>
    </div>
  )
}