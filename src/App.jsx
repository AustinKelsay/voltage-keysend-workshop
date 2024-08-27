import React, { useState, useEffect } from "react";
import { getInfo, fetchKeysends, sendKeysend } from "./lib/lnd.js";
import "./App.css";

export default function App() {
  const [keysends, setKeysends] = useState([]);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [pubkey, setPubkey] = useState("");

  const fetchInfo = async () => {
    const fetchedInfo = await getInfo();
    console.log(fetchedInfo);
    setPubkey(fetchedInfo.identity_pubkey);
  };

  const fetchAndSetKeysends = async () => {
    const fetchedKeysends = await fetchKeysends();
    setKeysends(fetchedKeysends);
  };

  const handleSendKeysend = async (e) => {
    e.preventDefault();
    try {
      await sendKeysend(destination, amount, message);
      alert("Keysend sent successfully!");
      fetchAndSetKeysends(); // Refresh the list after sending
    } catch (error) {
      alert("Error sending keysend: " + error.message);
    }
  };

  useEffect(() => {
    fetchInfo();
    fetchAndSetKeysends();
  }, []);

  return (
    <div className="container mx-auto p-4 relative">
      <div className="mb-4 flex flex-row items-end justify-between">
        <h1 className="text-2xl font-bold">Keysend Dashboard</h1>
      {pubkey && (
        <p className="text-lg font-bold text-gray-500">
          Connected to pubkey: {pubkey.slice(0, 15)}...
        </p>
      )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Send Keysend</h2>
        <form onSubmit={handleSendKeysend} className="space-y-4">
          <div>
            <label className="block mb-1">Destination:</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Amount (sats):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Message:</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Send Keysend
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Received Keysends</h2>
        <ul className="space-y-2">
          {keysends.map((keysend, index) => (
            <li key={index} className="border p-2 rounded">
              <p>
                <strong>Amount:</strong> {keysend.amount} sats
              </p>
              <p>
                <strong>Date:</strong> {keysend.date}
              </p>
              <p>
                <strong>Message:</strong> {keysend.message}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
