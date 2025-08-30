// src/components/Dashboard.js
import React, { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import "./Dashboard";
import {
  connectWallet,
  getRecordRegistry,
  getAccessManager,
} from "../utils/connects";

const PINATA_API_KEY = "5fcb039ed605db2563a1";
const PINATA_SECRET_KEY = "da4c4a0677c228f1ec6fb8dd0025c5068c20d0bfe2472f34cc1cf0cced6fe9d7";

export default function Dashboard() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [status, setStatus] = useState("");

  const [file, setFile] = useState(null);
  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [recordId, setRecordId] = useState("");

  const [doctor, setDoctor] = useState("");
  const [expiry, setExpiry] = useState("");
  const [accessResult, setAccessResult] = useState(null);

  // Connect wallet
  const handleConnect = async () => {
    try {
      const { provider: prov, signer: s, account: acct } = await connectWallet();
      setProvider(prov);
      setSigner(s);
      setAccount(acct);
      setStatus("Wallet connected: " + acct);
    } catch (err) {
      console.error(err);
      setStatus("Failed to connect: " + (err?.message || err));
    }
  };

  function requireSigner() {
    if (!signer) throw new Error("No wallet connected. Click Connect Wallet first.");
    return signer;
  }

  // --- New File Upload + Add Record Logic ---
  const uploadToPinata = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: "Infinity",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.IpfsHash;
  };

  const fileToBytes32 = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return ethers.keccak256(bytes);
  };

  const handleAddRecord = async () => {
    try {
      if (!file) throw new Error("Select a file first!");

      const s = requireSigner();
      const contract = getRecordRegistry(s);

      setStatus("Uploading file to IPFS...");
      const cid = await uploadToPinata(file);

      setStatus("Generating file hash...");
      const hash = await fileToBytes32(file);

      setStatus("Sending transaction...");
      const tx = await contract.addRecord(cid, hash);
      await tx.wait();

      setStatus(`Record added! CID: ${cid}`);
      setFile(null); // reset file input
    } catch (err) {
      console.error(err);
      setStatus("Add record error: " + (err?.message || err));
    }
  };

  // Fetch record logic (unchanged)
  const handleGetRecord = async () => {
    try {
      if (!provider) throw new Error("Connect wallet first.");
      const contract = getRecordRegistry(provider);
      const rec = await contract.getRecord(recordId);
      const safeRec = JSON.parse(JSON.stringify(rec, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      ));
      setFetchedRecord(safeRec);
      setStatus("Record fetched.");
    } catch (err) {
      console.error(err);
      setStatus("Fetch record error: " + (err?.message || err));
    }
  };

  // Access management (unchanged)
  const handleGrantAccess = async () => {
    try {
      const s = requireSigner();
      const manager = getAccessManager(s);
      const encodedKey = "0x1234";
      const tx = await manager.grantAccess(recordId, doctor, parseInt(expiry), encodedKey);
      await tx.wait();
      setStatus("Access granted.");
    } catch (err) {
      console.error(err);
      setStatus("Grant access error: " + (err?.message || err));
    }
  };

  const handleRevokeAccess = async () => {
    try {
      const s = requireSigner();
      const manager = getAccessManager(s);
      const tx = await manager.revokeAccess(recordId, doctor);
      await tx.wait();
      setStatus("Access revoked.");
    } catch (err) {
      console.error(err);
      setStatus("Revoke access error: " + (err?.message || err));
    }
  };

  const handleCheckAccess = async () => {
    try {
      if (!provider) throw new Error("Connect wallet first.");
      const manager = getAccessManager(provider);
      const res = await manager.hasAccess(recordId, doctor);
      setAccessResult(res);
      setStatus("Checked access.");
    } catch (err) {
      console.error(err);
      setStatus("Check access error: " + (err?.message || err));
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, Arial" }}>
      <h1>MedManage — Dashboard</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={handleConnect} style={{ padding: "8px 12px" }}>Connect Wallet</button>
        <div style={{ marginTop: 6 }}><strong>Wallet:</strong> {account || "(not connected)"}</div>
        <div style={{ marginTop: 6, color: "#333" }}>{status}</div>
      </div>

      <hr />

      <section style={{ marginTop: 12 }}>
        <h3>Add Record</h3>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <div style={{ height: 6 }} />
        <button onClick={handleAddRecord} style={{ padding: "6px 10px" }}>Upload & Add Record</button>
      </section>

      <hr />

      <section style={{ marginTop: 12 }}>
        <h3>Get Record</h3>
        <input placeholder="Record ID" value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 160 }} />
        <div style={{ height: 6 }} />
        <button onClick={handleGetRecord} style={{ padding: "6px 10px" }}>Fetch</button>

        {fetchedRecord && (
          <div style={{ marginTop: 10, padding: 8, border: "1px solid #ddd" }}>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {JSON.stringify(fetchedRecord, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <hr />

      <section style={{ marginTop: 12 }}>
        <h3>Access (Grant / Revoke / Check)</h3>
        <input placeholder="Doctor address" value={doctor} onChange={e => setDoctor(e.target.value)} style={{ width: 420 }} />
        <div style={{ height: 6 }} />
        <input placeholder="Expiry (unix seconds)" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ width: 240 }} />
        <div style={{ height: 6 }} />
        <button onClick={handleCheckAccess} style={{ marginRight: 8 }}>Check</button>
        <button onClick={handleGrantAccess} style={{ marginRight: 8 }}>Grant</button>
        <button onClick={handleRevokeAccess}>Revoke</button>

        {accessResult !== null && (
          <div style={{ marginTop: 8 }}>Access: {accessResult ? "✅ Granted" : "❌ Denied"}</div>
        )}
      </section>
    </div>
  );
}