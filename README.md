# 🛡️ Smart Tourist Safety Monitoring & Incident Response System

This project provides a **tourist identity and safety monitoring backend** powered by **Node.js, Express, Supabase, Blockchain (Sepolia), and QR Codes**.  
It enables secure tourist onboarding via KYC, generates unique **DTID hashes**, stores them on-chain, and issues **QR codes** for verification and monitoring.

---

## ✨ Features
- **KYC Verification**  
  Collects tourist details (ID, trip details, contacts, itinerary).
- **DTID Hashing**  
  Generates unique DTID using SHA-256 hash of `id + trip_start + trip_end`.
- **Blockchain Integration (Sepolia)**  
  Stores DTID on-chain for immutability and tamper-proof identity.
- **QR Code Generation**  
  Each tourist receives a QR code linked to their DTID.
- **Supabase Integration**  
  - Tourist details stored in Supabase DB.  
  - QR codes stored in Supabase Storage for frontend access.  
- **JWT Authentication** for Admin and Tourist sessions.
- **Dashboard APIs** for admins to view clusters, alerts, and statistics.

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js  
- **Database & Storage:** Supabase  
- **Blockchain:** Ethereum Sepolia Testnet  
- **Authentication:** JWT  
- **Utilities:** bcryptjs, qrcode, crypto  

---

## 📂 Project Structure
src/
├── config/
│ ├── auth.js # JWT setup
│ ├── database.js # Supabase client
├── controllers/
│ ├── kycController.js # Tourist KYC and profile logic
│ ├── authController.js # Admin + tourist auth
├── middleware/
│ ├── auth.js # JWT middleware
├── routes/
│ ├── auth.js # /auth endpoints
│ ├── kyc.js # /kyc endpoints
│ ├── dashboard.js # /dashboard endpoints
├── services/
│ ├── hashService.js # SHA-256 DTID generator
│ ├── blockchainService.js # Send DTID to Sepolia
│ ├── qrService.js # Generate & upload QR to Supabase
├── server.js # Entry point

markdown
Copy code

---

## ⚡ API Endpoints

### 🔑 Authentication
- `POST /auth/admin/login` → Admin login (username: `admin`, password: `admin123`)  
- `POST /auth/refresh` → Refresh tourist token  

### 🧾 KYC
- `POST /kyc/verify` → Tourist registration + KYC verification  
- `GET /kyc/:dtid` → Fetch tourist profile  

### 📍 Location & Safety
- `POST /location/update` → Update tourist location  
- `GET /location/:dtid` → Get latest location  
- `GET /location/:dtid/history` → Get location history  

### 📊 Dashboard (Admin only)
- `GET /dashboard/clusters` → View tourist clusters  
- `GET /dashboard/alerts` → Active alerts  
- `GET /dashboard/stats` → Dashboard statistics  

---

## 🚀 Setup & Installation

1. **Clone Repository**
```bash
git clone https://github.com/your-username/smart-tourist-backend.git
cd smart-tourist-backend
Install Dependencies

bash
Copy code
npm install
Setup Environment Variables
Create a .env file in root:

env
Copy code
PORT=5000
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=your_secret_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=your_wallet_private_key
Run Backend

bash
Copy code
npm run dev
