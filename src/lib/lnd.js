import axios from "axios";
import CryptoJS from "crypto-js";
import { Buffer } from "buffer";

const MACAROON = import.meta.env.VITE_MACAROON;
const HOST = import.meta.env.VITE_LND_HOST;

const lnd = axios.create({
  baseURL: `https://${HOST}:8080`,
  headers: {
    "Content-Type": "application/json",
    "Grpc-Metadata-Macaroon": MACAROON,
  },
});

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

export const fetchKeysends = async () => {
    try {
      const response = await lnd.get("/v1/invoices", {
        params: {
          pending_only: false,
          num_max_invoices: 1000,
          reversed: true,
        },
      });
      if (response.data.invoices && response.data.invoices.length > 0) {
        const keysendMessages = response.data.invoices
          .filter((inv) => inv.is_keysend && inv.state === "SETTLED")
          .reverse()
          .map((inv) => {
            const customRecords = inv.htlcs[0]?.custom_records || {};
            const messageRecord = customRecords["34349334"];
            let decodedMessage = "";
            if (messageRecord) {
              decodedMessage = Buffer.from(messageRecord, "base64").toString("utf8");
            }
            return {
              amount: inv.value,
              date: new Date(parseInt(inv.settle_date) * 1000).toLocaleString(),
              message: decodedMessage,
            };
          })
          .filter(keysend => keysend.message !== ""); // Only keep keysends with non-empty messages
  
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

export const sendKeysend = async (destination, amount, message) => {
  try {
    const preimage = CryptoJS.lib.WordArray.random(32);
    const preimageHex = preimage.toString(CryptoJS.enc.Hex);
    const hash = CryptoJS.SHA256(preimage);
    const paymentHash = hash.toString(CryptoJS.enc.Hex);
    const preimageBuffer = Buffer.from(preimageHex, "hex");
    const paymentHashBuffer = Buffer.from(paymentHash, "hex");
    const requestBody = {
      dest: Buffer.from(destination, "hex").toString("base64"),
      amt: amount,
      payment_hash: paymentHashBuffer.toString("base64"),
      final_cltv_delta: 40,
      allow_self_payment: true,
      dest_custom_records: {
        34349334: Buffer.from(message, "utf8").toString("base64"),
        5482373484: preimageBuffer.toString("base64"),
      },
      fee_limit: {
        fixed: 1000,
      },
      dest_features: [9],
    };
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
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
