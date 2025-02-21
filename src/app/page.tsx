"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function Home() {
  const [sponsorKey, setSponsorKey] = useState("")
  const [compromisedKey, setCompromisedKey] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState("")
  const [gasFeeInEth, setGasFeeInEth] = useState("0")
  const [ethPriceInUsd, setEthPriceInUsd] = useState("0")
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
    <div className="min-h-screen p-2">
      <div className="max-w-2xl mx-auto bg-secondary p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-accent">Token Recovery</h1>
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
    </div>
  )
}