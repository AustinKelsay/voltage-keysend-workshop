import React, { useState, useEffect } from "react";
import { getInfo, fetchKeysends, sendKeysend } from "./lib/lnd.js";
import "./App.css";

export default function App() {
  const [keysends, setKeysends] = useState([]);
  const [formData, setFormData] = useState({ destination: "", amount: "", message: "" });
  const [pubkey, setPubkey] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const fetchedInfo = await getInfo();
      setPubkey(fetchedInfo.identity_pubkey);
      const fetchedKeysends = await fetchKeysends();
      setKeysends(fetchedKeysends);
    };
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendKeysend = async (e) => {
    e.preventDefault();
    try {
      await sendKeysend(formData.destination, formData.amount, formData.message);
      alert("Keysend sent successfully!");
      const fetchedKeysends = await fetchKeysends();
      setKeysends(fetchedKeysends);
    } catch (error) {
      alert("Error sending keysend: " + error.message);
    }
  };

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
          {["destination", "amount", "message"].map((field) => (
            <div key={field}>
              <label className="block mb-1 capitalize">{field}:</label>
              <input
                type={field === "amount" ? "number" : "text"}
                name={field}
                value={formData[field]}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          ))}
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
              {Object.entries(keysend).map(([key, value]) => (
                <p key={key}>
                  <strong className="capitalize">{key}:</strong> {key === "amount" ? `${value} sats` : value}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}