import axios from "axios";
import CryptoJS from "crypto-js";
import { Buffer } from "buffer";

// Environment variables for LND connection
const MACAROON = import.meta.env.VITE_MACAROON;
const HOST = import.meta.env.VITE_LND_HOST;

// Create an axios instance for LND API calls
const lnd = axios.create({
  baseURL: `https://${HOST}:8080`,
  headers: {
    "Content-Type": "application/json",
    "Grpc-Metadata-Macaroon": MACAROON,
  },
});

// Fetch general information about the LND node
export const getInfo = async () => {
  try {
    const response = await lnd.get("/v1/getinfo");
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching LND info:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
};

// Fetch and process keysend messages
export const fetchKeysends = async () => {
  try {
    // Fetch invoices from LND
    const response = await lnd.get("/v1/invoices", {
      params: {
        pending_only: false,
        num_max_invoices: 1000,
        reversed: true,
      },
    });

    if (response.data.invoices && response.data.invoices.length > 0) {
      const keysendMessages = response.data.invoices
        // Filter for settled keysend invoices
        .filter((inv) => inv.is_keysend && inv.state === "SETTLED")
        .reverse()
        .map((inv) => {
          // Extract and decode the keysend message
          const customRecords = inv.htlcs[0]?.custom_records || {};
          const messageRecord = customRecords["34349334"];
          let decodedMessage = "";
          if (messageRecord) {
            decodedMessage = Buffer.from(messageRecord, "base64").toString("utf8");
          }

          // Return formatted keysend data
          return {
            amount: inv.value,
            date: new Date(parseInt(inv.settle_date) * 1000).toLocaleString(),
            message: decodedMessage,
          };
        })
        // Only keep keysends with non-empty messages
        .filter(keysend => keysend.message !== "");

      return keysendMessages;
    } else {
      return [];
    }
  } catch (err) {
    console.error(
      "Error fetching keysends from LND:",
      err.response ? err.response.data : err.message,
    );
    throw err;
  }
};

// Send a keysend payment
export const sendKeysend = async (destination, amount, message) => {
  try {
    // Generate a random preimage
    const preimage = CryptoJS.lib.WordArray.random(32);
    const preimageHex = preimage.toString(CryptoJS.enc.Hex);
    
    // Generate payment hash from preimage
    const hash = CryptoJS.SHA256(preimage);
    const paymentHash = hash.toString(CryptoJS.enc.Hex);
    
    // Convert preimage and payment hash to buffers
    const preimageBuffer = Buffer.from(preimageHex, "hex");
    const paymentHashBuffer = Buffer.from(paymentHash, "hex");
    
    // Prepare the request body for the keysend
    const requestBody = {
      dest: Buffer.from(destination, "hex").toString("base64"),
      amt: amount,
      payment_hash: paymentHashBuffer.toString("base64"),
      final_cltv_delta: 40,
      allow_self_payment: true,
      dest_custom_records: {
        34349334: Buffer.from(message, "utf8").toString("base64"), // Keysend message
        5482373484: preimageBuffer.toString("base64"), // Preimage
      },
      fee_limit: {
        fixed: 1000,
      },
      dest_features: [9],
    };

    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    
    // Send the keysend payment
    const response = await lnd.post("/v1/channels/transactions", requestBody);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending keysend:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
};