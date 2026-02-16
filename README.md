# 🧠 Disk Optimization Suite v4.2 Pro

A high-fidelity, interactive disk scheduling simulator designed for advanced Operating Systems analysis. This suite provides a real-time "Digital Twin" of mechanical disk hardware, allowing users to visualize and compare different scheduling algorithms in a premium 3D environment.

![License](https://img.shields.io/badge/Version-4.2_Pro-6366f1)
![Tech](https://img.shields.io/badge/Built_With-React_|_Next.js_|_Framer_Motion-indigo)

## 🚀 Key Features

### 1. 🕹️ Direct Platter Injection
Forget typing coordinates. Click directly on the **3D Isometric Platter Stack** to inject data nodes. The system uses an **Isometric Coordinate Mapper** to translate your 2D click into 3D track positions (0-199).

### 2. 🦾 3D Mechanical Visualization
- **Multi-layer Platter Stack**: Realistic 4-layer mechanical disk representation.
- **Synchronized Actuator Arm**: High-fidelity movement with physics-based inertia.
- **Luminous Data Nodes**: Requests are physically visualized on the rotating disk.

### 3. 🌈 Adaptive Hardware Environment
The entire workspace breathes and shifts colors based on the active algorithm. Selecting a focus mode (e.g., SCAN vs. SSTF) changes the atmospheric ambient glow and actutator LED branding.

### 4. 📟 Kernel Audit Console
A diagnostic terminal provides real-time "hardware interrupt" logs, tracking every seek operation, playback event, and manual injection with millisecond precision.

### 5. 📊 Advanced Analytics
- **Continuous Trajectory Plotting**: Real-time charts that don't disappear when algorithms finish early.
- **Performance Delta Comparison**: Rank-based metrics showing Seek Count and Total Operational Time.
- **Audit Table**: Comprehensive trace logs for academic auditing.

## 🛠️ Algorithms Supported
- **FCFS** (First Come First Served)
- **SSTF** (Shortest Seek Time First)
- **SCAN** (Elevator)
- **C-SCAN** (Circular SCAN)
- **LOOK**
- **C-LOOK**

## 💻 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Custom Glassmorphism System
- **Animation**: Framer Motion (Orchestrated Staggered Transitions)
- **Charts**: Recharts (Customized for trajectory visibility)
- **Icons**: Lucide React

## 🚦 Getting Started

1. **Clone & Install**:
   ```bash
   git clone https://github.com/RichardRajuChirayath/Disk-Scheduling.git
   cd Disk-Scheduling
   npm install
   ```

2. **Launch Workspace**:
   ```bash
   npm run dev
   ```

3. **Operate**:
   - Use the **Machine State** panel to set head origin and track count.
   - Click the **3D Platter** to manually inject tracks.
   - Presets like **Ping-Pong** or **Chaos** are available for stress testing.

---
*Created as a high-fidelity virtuall mechanical disk resource for CIA-3 OS analysis.*
